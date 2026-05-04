/**
 * VIP Perk Coupon Operations
 * Handles Stripe coupon creation and management for VIP workshop discounts
 */

import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import type { VipPerk, VipPerkConfig, VipPerkWithTicket, CreateVipPerkRequest } from '@/lib/types/vip-perks';
import type Stripe from 'stripe';

const log = logger.scope('VipPerks');

/**
 * Generate a cryptographically random VIP coupon code
 * Format: VIP-{8 random hex chars, uppercase}
 */
function generateCouponCode(): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `VIP-${random}`;
}

/**
 * Get the VIP perk config (single-row)
 */
export async function getVipPerkConfig(): Promise<VipPerkConfig> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('vip_perk_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    log.error('Failed to fetch VIP perk config', error);
    throw new Error('VIP perk config not found');
  }

  return data as VipPerkConfig;
}

/**
 * Update the VIP perk config
 */
export async function updateVipPerkConfig(
  updates: {
    discount_percent?: number;
    restricted_product_ids?: string[];
    expires_at?: string | null;
    auto_send_email?: boolean;
    custom_email_message?: string | null;
  }
): Promise<VipPerkConfig> {
  const supabase = createServiceRoleClient();

  // Fetch the singleton config row to target the specific ID
  const config = await getVipPerkConfig();

  const { data, error } = await supabase
    .from('vip_perk_config')
    .update(updates)
    .eq('id', config.id)
    .select()
    .single();

  if (error || !data) {
    log.error('Failed to update VIP perk config', error);
    throw new Error(`Failed to update config: ${error?.message}`);
  }

  log.info('VIP perk config updated', { updates });
  return data as VipPerkConfig;
}

/**
 * Check if a ticket already has a VIP perk
 */
export async function getVipPerkByTicketId(ticketId: string): Promise<VipPerk | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('vip_perks')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();

  if (error) {
    log.error('Failed to check VIP perk for ticket', error, { ticketId });
    throw new Error(`Failed to check VIP perk: ${error.message}`);
  }

  return data as VipPerk | null;
}

/**
 * Create a VIP perk coupon for a ticket
 * Creates Stripe coupon + promotion code + DB record
 */
export async function createVipPerkCoupon(data: CreateVipPerkRequest): Promise<VipPerk> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  // Check idempotency — skip if perk already exists for this ticket
  const existing = await getVipPerkByTicketId(data.ticket_id);
  if (existing) {
    log.info('VIP perk already exists for ticket, skipping', { ticketId: data.ticket_id, code: existing.code });
    return existing;
  }

  // Fetch ticket to verify it exists and is VIP
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, first_name, last_name, email, ticket_category')
    .eq('id', data.ticket_id)
    .single();

  if (ticketError || !ticket) {
    log.error('Ticket not found for VIP perk creation', ticketError, { ticketId: data.ticket_id });
    throw new Error('Ticket not found');
  }

  if (ticket.ticket_category !== 'vip') {
    log.error('Ticket is not eligible for VIP perk creation', undefined, {
      ticketId: data.ticket_id,
      ticketCategory: ticket.ticket_category,
    });
    throw new Error('Ticket is not a VIP ticket');
  }

  const discountPercent = data.discount_percent ?? 20;
  const code = generateCouponCode();

  // Create Stripe coupon
  const stripeCouponParams: Stripe.CouponCreateParams = {
    id: code,
    name: `VIP Workshop Discount: ${code}`,
    percent_off: discountPercent,
    max_redemptions: 1,
    metadata: {
      ticket_id: data.ticket_id,
      type: 'vip_perk',
    },
  };

  if (data.expires_at) {
    stripeCouponParams.redeem_by = Math.floor(new Date(data.expires_at).getTime() / 1000);
  }

  if (data.restricted_product_ids.length > 0) {
    stripeCouponParams.applies_to = {
      products: data.restricted_product_ids,
    };
  }

  let stripeCoupon: Stripe.Coupon;
  try {
    stripeCoupon = await stripe.coupons.create(stripeCouponParams);
  } catch (err) {
    log.error('Failed to create Stripe coupon for VIP perk', err as Error, { code });
    throw new Error(`Failed to create Stripe coupon: ${(err as Error).message}`);
  }

  // Create promotion code
  let promotionCode: Stripe.PromotionCode;
  try {
    promotionCode = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: stripeCoupon.id },
      code,
      max_redemptions: 1,
      expires_at: data.expires_at
        ? Math.floor(new Date(data.expires_at).getTime() / 1000)
        : undefined,
      metadata: {
        ticket_id: data.ticket_id,
        type: 'vip_perk',
      },
    });
  } catch (err) {
    // Cleanup coupon on failure
    await stripe.coupons.del(stripeCoupon.id);
    log.error('Failed to create Stripe promotion code for VIP perk', err as Error, { code });
    throw new Error(`Failed to create Stripe promotion code: ${(err as Error).message}`);
  }

  // Store in database
  const { data: perk, error: insertError } = await supabase
    .from('vip_perks')
    .insert({
      ticket_id: data.ticket_id,
      stripe_coupon_id: stripeCoupon.id,
      stripe_promotion_code_id: promotionCode.id,
      code,
      discount_percent: discountPercent,
      restricted_product_ids: data.restricted_product_ids,
      max_redemptions: 1,
      current_redemptions: 0,
      expires_at: data.expires_at,
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    // Cleanup Stripe resources on DB failure
    await stripe.promotionCodes.update(promotionCode.id, { active: false });
    await stripe.coupons.del(stripeCoupon.id);
    log.error('Failed to store VIP perk in database', insertError, { code });
    throw new Error(`Failed to store VIP perk: ${insertError.message}`);
  }

  log.info('VIP perk created', {
    perkId: perk.id,
    code,
    ticketId: data.ticket_id,
    email: ticket.email,
  });

  return perk as VipPerk;
}

/**
 * List all VIP perks with joined ticket info
 */
export async function listVipPerks(): Promise<VipPerkWithTicket[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('vip_perks')
    .select(`
      *,
      ticket:tickets!inner(id, first_name, last_name, email, ticket_category, status)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Failed to list VIP perks', error);
    throw new Error(`Failed to list VIP perks: ${error.message}`);
  }

  return (data || []) as unknown as VipPerkWithTicket[];
}

/**
 * Deactivate a VIP perk
 */
export async function deactivateVipPerk(perkId: string): Promise<void> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  const { data: perk, error: fetchError } = await supabase
    .from('vip_perks')
    .select('stripe_coupon_id, stripe_promotion_code_id')
    .eq('id', perkId)
    .single();

  if (fetchError || !perk) {
    log.error('Failed to fetch VIP perk for deactivation', fetchError);
    throw new Error('VIP perk not found');
  }

  // Deactivate in Stripe
  try {
    if (perk.stripe_promotion_code_id) {
      await stripe.promotionCodes.update(perk.stripe_promotion_code_id, { active: false });
    }
    await stripe.coupons.del(perk.stripe_coupon_id);
  } catch (err) {
    log.error('Failed to deactivate Stripe coupon for VIP perk', err as Error);
    // Continue to update database
  }

  const { error } = await supabase
    .from('vip_perks')
    .update({ is_active: false })
    .eq('id', perkId);

  if (error) {
    log.error('Failed to deactivate VIP perk in database', error);
    throw new Error(`Failed to deactivate VIP perk: ${error.message}`);
  }

  log.info('VIP perk deactivated', { perkId });
}

/**
 * Sync perk redemption count from Stripe
 */
export async function syncPerkRedemptions(perkId: string): Promise<number> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  const { data: perk, error: fetchError } = await supabase
    .from('vip_perks')
    .select('stripe_coupon_id')
    .eq('id', perkId)
    .single();

  if (fetchError || !perk) {
    throw new Error('VIP perk not found');
  }

  let redemptions = 0;
  try {
    const stripeCoupon = await stripe.coupons.retrieve(perk.stripe_coupon_id);
    redemptions = stripeCoupon.times_redeemed || 0;
  } catch (err) {
    log.error('Failed to fetch Stripe coupon for VIP perk', err as Error);
    throw new Error(`Failed to sync VIP perk: ${(err as Error).message}`);
  }

  const { error } = await supabase
    .from('vip_perks')
    .update({ current_redemptions: redemptions })
    .eq('id', perkId);

  if (error) {
    log.error('Failed to update VIP perk redemptions', error);
    throw new Error(`Failed to update VIP perk: ${error.message}`);
  }

  return redemptions;
}
