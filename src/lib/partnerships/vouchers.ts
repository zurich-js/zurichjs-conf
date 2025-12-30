/**
 * Partnership Voucher Operations
 * Handles raffle/giveaway voucher creation and management
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import type {
  PartnershipVoucher,
  CreateVoucherRequest,
  VoucherPurpose,
} from '@/lib/types/partnership';

const log = logger.scope('PartnershipVouchers');

/**
 * Auto-activate partnership if currently pending
 */
async function autoActivatePartnership(partnershipId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Check current status
  const { data: partnership, error: fetchError } = await supabase
    .from('partnerships')
    .select('status')
    .eq('id', partnershipId)
    .single();

  if (fetchError || !partnership) {
    log.warn('Could not fetch partnership for auto-activation', { partnershipId });
    return;
  }

  // Only activate if currently pending
  if (partnership.status === 'pending') {
    const { error: updateError } = await supabase
      .from('partnerships')
      .update({ status: 'active' })
      .eq('id', partnershipId);

    if (updateError) {
      log.warn('Failed to auto-activate partnership', { partnershipId, error: updateError });
    } else {
      log.info('Partnership auto-activated', { partnershipId });
    }
  }
}

/**
 * Generate a unique voucher code
 */
function generateVoucherCode(purpose: VoucherPurpose): string {
  const prefixes: Record<VoucherPurpose, string> = {
    community_discount: 'COMM',
    raffle: 'RAFFLE',
    giveaway: 'GIFT',
    organizer_discount: 'ORG',
  };

  const prefix = prefixes[purpose];
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomPart}`;
}

/**
 * List vouchers for a partnership
 */
export async function listVouchers(partnershipId: string): Promise<PartnershipVoucher[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('partnership_vouchers')
    .select('*')
    .eq('partnership_id', partnershipId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Failed to list vouchers', error, { partnershipId });
    throw new Error(`Failed to list vouchers: ${error.message}`);
  }

  return data as PartnershipVoucher[];
}

/**
 * Get a single voucher by ID
 */
export async function getVoucher(id: string): Promise<PartnershipVoucher | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('partnership_vouchers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Failed to get voucher', error, { voucherId: id });
    throw new Error(`Failed to get voucher: ${error.message}`);
  }

  return data as PartnershipVoucher;
}

/**
 * Get a voucher by code
 */
export async function getVoucherByCode(code: string): Promise<PartnershipVoucher | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('partnership_vouchers')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Failed to get voucher by code', error, { code });
    throw new Error(`Failed to get voucher: ${error.message}`);
  }

  return data as PartnershipVoucher;
}

/**
 * Create one or more vouchers with Stripe and store in database
 */
export async function createVouchers(
  data: CreateVoucherRequest
): Promise<PartnershipVoucher[]> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();
  const quantity = data.quantity || 1;
  const vouchers: PartnershipVoucher[] = [];

  for (let i = 0; i < quantity; i++) {
    const code = data.code && quantity === 1
      ? data.code.toUpperCase()
      : generateVoucherCode(data.purpose);

    // Create a Stripe coupon for the fixed amount
    let stripeCoupon;
    try {
      stripeCoupon = await stripe.coupons.create({
        id: code,
        name: `Voucher: ${code}`,
        amount_off: data.amount,
        currency: data.currency.toLowerCase(),
        max_redemptions: 1, // Vouchers are single-use
        metadata: {
          partnership_id: data.partnership_id,
          purpose: data.purpose,
          voucher_code: code,
        },
      });
    } catch (err) {
      log.error('Failed to create Stripe voucher coupon', err as Error, { code });
      throw new Error(`Failed to create Stripe voucher: ${(err as Error).message}`);
    }

    // Create a promotion code for easier usage
    let promotionCode;
    try {
      promotionCode = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: stripeCoupon.id },
        code: code,
        max_redemptions: 1,
        metadata: {
          partnership_id: data.partnership_id,
          purpose: data.purpose,
        },
      });
    } catch (err) {
      // Clean up the coupon if promotion code creation fails
      await stripe.coupons.del(stripeCoupon.id);
      log.error('Failed to create Stripe promotion code for voucher', err as Error, { code });
      throw new Error(`Failed to create voucher promotion code: ${(err as Error).message}`);
    }

    // Store in database
    const { data: voucher, error } = await supabase
      .from('partnership_vouchers')
      .insert({
        partnership_id: data.partnership_id,
        stripe_coupon_id: stripeCoupon.id,
        stripe_promotion_code_id: promotionCode.id,
        code: code,
        purpose: data.purpose,
        amount: data.amount,
        currency: data.currency,
        recipient_name: data.recipient_name,
        recipient_email: data.recipient_email,
        is_redeemed: false,
      })
      .select()
      .single();

    if (error) {
      // Clean up Stripe resources if database insert fails
      await stripe.promotionCodes.update(promotionCode.id, { active: false });
      await stripe.coupons.del(stripeCoupon.id);
      log.error('Failed to store voucher in database', error, { code });
      throw new Error(`Failed to store voucher in database: ${error.message}`);
    }

    vouchers.push(voucher as PartnershipVoucher);
    log.info('Voucher created', {
      voucherId: voucher.id,
      code,
      partnershipId: data.partnership_id,
      purpose: data.purpose,
    });
  }

  // Auto-activate partnership if pending
  await autoActivatePartnership(data.partnership_id);

  return vouchers;
}

/**
 * Mark a voucher as redeemed
 */
export async function markVoucherRedeemed(
  voucherId: string,
  redeemedByEmail: string
): Promise<PartnershipVoucher> {
  const supabase = createServiceRoleClient();

  const { data: voucher, error } = await supabase
    .from('partnership_vouchers')
    .update({
      is_redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by_email: redeemedByEmail,
    })
    .eq('id', voucherId)
    .select()
    .single();

  if (error) {
    log.error('Failed to mark voucher as redeemed', error, { voucherId });
    throw new Error(`Failed to mark voucher as redeemed: ${error.message}`);
  }

  log.info('Voucher redeemed', { voucherId, redeemedByEmail });

  return voucher as PartnershipVoucher;
}

/**
 * Delete a voucher
 */
export async function deleteVoucher(voucherId: string): Promise<void> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  // Get the voucher from database
  const { data: voucher, error: fetchError } = await supabase
    .from('partnership_vouchers')
    .select('stripe_coupon_id, stripe_promotion_code_id, is_redeemed')
    .eq('id', voucherId)
    .single();

  if (fetchError || !voucher) {
    log.error('Failed to fetch voucher for deletion', fetchError);
    throw new Error('Voucher not found');
  }

  if (voucher.is_redeemed) {
    throw new Error('Cannot delete a redeemed voucher');
  }

  // Delete from Stripe
  try {
    if (voucher.stripe_promotion_code_id) {
      await stripe.promotionCodes.update(voucher.stripe_promotion_code_id, {
        active: false,
      });
    }
    await stripe.coupons.del(voucher.stripe_coupon_id);
  } catch (err) {
    log.error('Failed to delete Stripe voucher', err as Error);
    // Continue to delete from database even if Stripe fails
  }

  // Delete from database
  const { error } = await supabase
    .from('partnership_vouchers')
    .delete()
    .eq('id', voucherId);

  if (error) {
    log.error('Failed to delete voucher from database', error);
    throw new Error(`Failed to delete voucher: ${error.message}`);
  }

  log.info('Voucher deleted', { voucherId });
}

/**
 * Get formatted voucher value for display
 */
export function formatVoucherValue(voucher: PartnershipVoucher): string {
  const amount = voucher.amount / 100;
  return `${voucher.currency} ${amount.toFixed(2)}`;
}

/**
 * Get voucher statistics for a partnership
 */
export async function getVoucherStats(partnershipId: string): Promise<{
  total: number;
  redeemed: number;
  unredeemed: number;
  totalValue: number;
  redeemedValue: number;
  byPurpose: Record<VoucherPurpose, { total: number; redeemed: number }>;
}> {
  const supabase = createServiceRoleClient();

  const { data: vouchers, error } = await supabase
    .from('partnership_vouchers')
    .select('purpose, amount, is_redeemed')
    .eq('partnership_id', partnershipId);

  if (error) {
    log.error('Failed to get voucher stats', error, { partnershipId });
    throw new Error(`Failed to get voucher stats: ${error.message}`);
  }

  const byPurpose: Record<VoucherPurpose, { total: number; redeemed: number }> = {
    community_discount: { total: 0, redeemed: 0 },
    raffle: { total: 0, redeemed: 0 },
    giveaway: { total: 0, redeemed: 0 },
    organizer_discount: { total: 0, redeemed: 0 },
  };

  let totalValue = 0;
  let redeemedValue = 0;
  let redeemed = 0;

  for (const v of vouchers || []) {
    const purpose = v.purpose as VoucherPurpose;
    byPurpose[purpose].total++;
    totalValue += v.amount;

    if (v.is_redeemed) {
      redeemed++;
      redeemedValue += v.amount;
      byPurpose[purpose].redeemed++;
    }
  }

  return {
    total: vouchers?.length || 0,
    redeemed,
    unredeemed: (vouchers?.length || 0) - redeemed,
    totalValue,
    redeemedValue,
    byPurpose,
  };
}
