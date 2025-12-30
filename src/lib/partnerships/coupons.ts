/**
 * Partnership Coupon Operations
 * Handles Stripe coupon creation and management
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import type {
  PartnershipCoupon,
  CreateCouponRequest,
  StripeProductInfo,
} from '@/lib/types/partnership';
import type Stripe from 'stripe';

const log = logger.scope('PartnershipCoupons');

// Type helper for untyped tables (until migration is run and types regenerated)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedTable = any;

/**
 * Auto-activate partnership if currently pending
 */
async function autoActivatePartnership(partnershipId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Check current status
  const { data: partnership, error: fetchError } = await (supabase
    .from('partnerships' as UntypedTable) as UntypedTable)
    .select('status')
    .eq('id', partnershipId)
    .single();

  if (fetchError || !partnership) {
    log.warn('Could not fetch partnership for auto-activation', { partnershipId });
    return;
  }

  // Only activate if currently pending
  if (partnership.status === 'pending') {
    const { error: updateError } = await (supabase
      .from('partnerships' as UntypedTable) as UntypedTable)
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
 * List coupons for a partnership
 */
export async function listCoupons(partnershipId: string): Promise<PartnershipCoupon[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .select('*')
    .eq('partnership_id', partnershipId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Failed to list coupons', error, { partnershipId });
    throw new Error(`Failed to list coupons: ${error.message}`);
  }

  return data as PartnershipCoupon[];
}

/**
 * Get available Stripe products for coupon restrictions
 */
export async function getStripeProducts(): Promise<StripeProductInfo[]> {
  const stripe = getStripeClient();

  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description || undefined,
    active: product.active,
    default_price_id: typeof product.default_price === 'string'
      ? product.default_price
      : product.default_price?.id,
    metadata: product.metadata,
  }));
}

/**
 * Create a coupon with Stripe and store in database
 */
export async function createCoupon(data: CreateCouponRequest): Promise<PartnershipCoupon> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  // Create the coupon in Stripe
  const stripeCouponParams: Stripe.CouponCreateParams = {
    id: data.code.toUpperCase(),
    name: `Partnership Coupon: ${data.code}`,
    metadata: {
      partnership_id: data.partnership_id,
      type: data.type,
    },
  };

  if (data.type === 'percentage') {
    stripeCouponParams.percent_off = data.discount_percent;
  } else {
    stripeCouponParams.amount_off = data.discount_amount;
    stripeCouponParams.currency = data.currency?.toLowerCase() || 'chf';
  }

  if (data.max_redemptions) {
    stripeCouponParams.max_redemptions = data.max_redemptions;
  }

  if (data.expires_at) {
    stripeCouponParams.redeem_by = Math.floor(new Date(data.expires_at).getTime() / 1000);
  }

  // Apply product restrictions if specified
  if (data.restricted_product_ids.length > 0) {
    stripeCouponParams.applies_to = {
      products: data.restricted_product_ids,
    };
  }

  let stripeCoupon: Stripe.Coupon;
  try {
    stripeCoupon = await stripe.coupons.create(stripeCouponParams);
  } catch (err) {
    log.error('Failed to create Stripe coupon', err as Error);
    throw new Error(`Failed to create Stripe coupon: ${(err as Error).message}`);
  }

  // Create a promotion code for easier sharing
  let promotionCode: Stripe.PromotionCode;
  try {
    promotionCode = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: stripeCoupon.id },
      code: data.code.toUpperCase(),
      max_redemptions: data.max_redemptions,
      expires_at: data.expires_at
        ? Math.floor(new Date(data.expires_at).getTime() / 1000)
        : undefined,
      metadata: {
        partnership_id: data.partnership_id,
      },
    });
  } catch (err) {
    // Clean up the coupon if promotion code creation fails
    await stripe.coupons.del(stripeCoupon.id);
    log.error('Failed to create Stripe promotion code', err as Error);
    throw new Error(`Failed to create Stripe promotion code: ${(err as Error).message}`);
  }

  // Store in database
  const { data: coupon, error } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .insert({
      partnership_id: data.partnership_id,
      stripe_coupon_id: stripeCoupon.id,
      stripe_promotion_code_id: promotionCode.id,
      code: data.code.toUpperCase(),
      type: data.type,
      discount_percent: data.discount_percent,
      discount_amount: data.discount_amount,
      currency: data.currency,
      restricted_product_ids: data.restricted_product_ids,
      max_redemptions: data.max_redemptions,
      current_redemptions: 0,
      expires_at: data.expires_at,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    // Clean up Stripe resources if database insert fails
    await stripe.promotionCodes.update(promotionCode.id, { active: false });
    await stripe.coupons.del(stripeCoupon.id);
    log.error('Failed to store coupon in database', error);
    throw new Error(`Failed to store coupon in database: ${error.message}`);
  }

  log.info('Coupon created', {
    couponId: coupon.id,
    code: data.code,
    partnershipId: data.partnership_id,
  });

  // Auto-activate partnership if pending
  await autoActivatePartnership(data.partnership_id);

  return coupon as PartnershipCoupon;
}

/**
 * Deactivate a coupon
 */
export async function deactivateCoupon(couponId: string): Promise<void> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  // Get the coupon from database
  const { data: coupon, error: fetchError } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .select('stripe_coupon_id, stripe_promotion_code_id')
    .eq('id', couponId)
    .single();

  if (fetchError || !coupon) {
    log.error('Failed to fetch coupon for deactivation', fetchError);
    throw new Error('Coupon not found');
  }

  // Deactivate in Stripe
  try {
    if (coupon.stripe_promotion_code_id) {
      await stripe.promotionCodes.update(coupon.stripe_promotion_code_id, {
        active: false,
      });
    }
    await stripe.coupons.del(coupon.stripe_coupon_id);
  } catch (err) {
    log.error('Failed to deactivate Stripe coupon', err as Error);
    // Continue to update database even if Stripe fails
  }

  // Update database
  const { error } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .update({ is_active: false })
    .eq('id', couponId);

  if (error) {
    log.error('Failed to deactivate coupon in database', error);
    throw new Error(`Failed to deactivate coupon: ${error.message}`);
  }

  log.info('Coupon deactivated', { couponId });
}

/**
 * Sync coupon redemption count from Stripe
 */
export async function syncCouponRedemptions(couponId: string): Promise<number> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  // Get the coupon from database
  const { data: coupon, error: fetchError } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .select('stripe_coupon_id')
    .eq('id', couponId)
    .single();

  if (fetchError || !coupon) {
    throw new Error('Coupon not found');
  }

  // Get redemption count from Stripe
  let redemptions = 0;
  try {
    const stripeCoupon = await stripe.coupons.retrieve(coupon.stripe_coupon_id);
    redemptions = stripeCoupon.times_redeemed || 0;
  } catch (err) {
    log.error('Failed to fetch Stripe coupon', err as Error);
    throw new Error(`Failed to sync coupon: ${(err as Error).message}`);
  }

  // Update database
  const { error } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .update({ current_redemptions: redemptions })
    .eq('id', couponId);

  if (error) {
    log.error('Failed to update coupon redemptions', error);
    throw new Error(`Failed to update coupon: ${error.message}`);
  }

  return redemptions;
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  // Get the coupon from database
  const { data: coupon, error: fetchError } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .select('stripe_coupon_id, stripe_promotion_code_id')
    .eq('id', couponId)
    .single();

  if (fetchError || !coupon) {
    log.error('Failed to fetch coupon for deletion', fetchError);
    throw new Error('Coupon not found');
  }

  // Delete from Stripe
  try {
    if (coupon.stripe_promotion_code_id) {
      await stripe.promotionCodes.update(coupon.stripe_promotion_code_id, {
        active: false,
      });
    }
    await stripe.coupons.del(coupon.stripe_coupon_id);
  } catch (err) {
    log.error('Failed to delete Stripe coupon', err as Error);
    // Continue to delete from database even if Stripe fails
  }

  // Delete from database
  const { error } = await (supabase
    .from('partnership_coupons' as UntypedTable) as UntypedTable)
    .delete()
    .eq('id', couponId);

  if (error) {
    log.error('Failed to delete coupon from database', error);
    throw new Error(`Failed to delete coupon: ${error.message}`);
  }

  log.info('Coupon deleted', { couponId });
}

/**
 * Get formatted discount string for display
 */
export function formatDiscount(coupon: PartnershipCoupon): string {
  if (coupon.type === 'percentage') {
    return `${coupon.discount_percent}% off`;
  }
  const amount = (coupon.discount_amount || 0) / 100;
  return `${coupon.currency} ${amount.toFixed(2)} off`;
}
