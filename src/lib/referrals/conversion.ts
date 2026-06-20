/**
 * Referral Conversion Processing
 * Handles the logic when a referred friend completes a purchase:
 * - Calculates the tier-based reward amount
 * - Creates/accumulates the referrer's Stripe voucher
 * - Records the conversion
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';
import { getReferralConfig, getRewardForTier } from './config';
import { getReferrerByCode } from './referrer';
import type { Referrer, ReferralConfig } from './types';
import type Stripe from 'stripe';

const log = logger.scope('Referral Conversion');

/**
 * Process a referral conversion when a referred friend's purchase completes.
 * Non-fatal: errors are logged but do not fail the ticket purchase.
 *
 * @param referralCode - The referral code from the checkout session metadata
 * @param refereeEmail - The email of the buyer who used the code
 * @param refereeTicketId - The ticket ID of the referee's purchase
 * @param stripeSessionId - The Stripe checkout session ID
 * @param referrerCurrency - The currency to use for the reward (from the referrer's ticket)
 */
export async function processReferralConversion(
  referralCode: string,
  refereeEmail: string,
  refereeTicketId: string | null,
  stripeSessionId: string,
  referrerCurrency: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  const stripe = getStripeClient();

  // 1. Look up referrer
  const referrer = await getReferrerByCode(referralCode);
  if (!referrer) {
    log.warn('Referral code not found during conversion', { referralCode });
    return;
  }

  // Self-referral guard (should be caught at checkout, but double-check)
  if (referrer.email === refereeEmail.toLowerCase()) {
    log.warn('Self-referral detected, skipping conversion', { referralCode, email: refereeEmail });
    return;
  }

  // 2. Load config
  let config: ReferralConfig;
  try {
    config = await getReferralConfig();
  } catch {
    log.error('Failed to load referral config during conversion', new Error('Config load failed'));
    return;
  }

  if (!config.is_active) {
    log.info('Referral programme is inactive, skipping conversion', { referralCode });
    return;
  }

  // 3. Calculate reward
  const newTotalReferrals = referrer.total_referrals + 1;
  const currency = referrer.active_voucher_currency || referrerCurrency;
  const { tier, amount: rewardAmount } = getRewardForTier(config.tiers, newTotalReferrals, currency);

  // 4. Handle voucher accumulation
  try {
    if (referrer.active_voucher_redeemed || referrer.active_voucher_amount === 0) {
      // Create fresh voucher
      await createFreshVoucher(stripe, supabase, referrer, rewardAmount, currency, config);
    } else {
      // Accumulate onto existing voucher
      const newAmount = referrer.active_voucher_amount + rewardAmount;
      await accumulateVoucher(stripe, supabase, referrer, newAmount, currency, config);
    }
  } catch (voucherError) {
    log.error('Failed to create/accumulate referral voucher', voucherError, {
      referralCode,
      referrerId: referrer.id,
    });
    // Continue to record the conversion even if voucher creation fails
  }

  // 5. Record conversion
  try {
    await (supabase.from as any)('referral_conversions').insert({
      referrer_id: referrer.id,
      referee_ticket_id: refereeTicketId,
      referee_email: refereeEmail.toLowerCase(),
      referee_stripe_session_id: stripeSessionId,
      reward_tier: tier,
      reward_amount: rewardAmount,
      reward_currency: currency,
    });
  } catch (conversionError) {
    log.error('Failed to record referral conversion', conversionError, {
      referralCode,
      referrerId: referrer.id,
    });
  }

  // 6. Update referrer stats
  try {
    await (supabase.from as any)('referrers')
      .update({
        total_referrals: newTotalReferrals,
        current_tier: tier,
      })
      .eq('id', referrer.id);
  } catch (updateError) {
    log.error('Failed to update referrer stats', updateError, { referrerId: referrer.id });
  }

  // 7. Track analytics
  const updatedReferrer = await getReferrerByCode(referralCode);
  await serverAnalytics.track('referral_converted', referrer.email, {
    referral_code: referralCode,
    referrer_email: referrer.email,
    referee_email: refereeEmail,
    reward_amount: rewardAmount,
    reward_tier: tier,
    accumulated_total: updatedReferrer?.active_voucher_amount ?? rewardAmount,
    reward_currency: currency,
  });
  await serverAnalytics.flush();

  log.info('Referral conversion processed', {
    referralCode,
    referrerEmail: referrer.email,
    refereeEmail,
    rewardAmount,
    tier,
    newTotalReferrals,
  });
}

/**
 * Create a fresh Stripe coupon + promotion code for the referrer
 */
async function createFreshVoucher(
  stripe: Stripe,
  supabase: any,
  referrer: Referrer,
  amount: number,
  currency: string,
  config: ReferralConfig
): Promise<void> {
  const coupon = await stripe.coupons.create({
    amount_off: amount,
    currency: currency.toLowerCase(),
    duration: 'once',
    max_redemptions: 1,
    metadata: {
      type: 'referral_reward',
      referrer_id: referrer.id,
      referral_code: referrer.referral_code,
    },
    ...(config.reward_restricted_product_ids.length > 0
      ? { applies_to: { products: config.reward_restricted_product_ids } }
      : {}),
  });

  const promotionCode = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    max_redemptions: 1,
    metadata: {
      type: 'referral_reward',
      referrer_id: referrer.id,
    },
  });

  await (supabase.from as any)('referrers')
    .update({
      active_voucher_stripe_coupon_id: coupon.id,
      active_voucher_stripe_promotion_code_id: promotionCode.id,
      active_voucher_code: promotionCode.code,
      active_voucher_amount: amount,
      active_voucher_currency: currency,
      active_voucher_redeemed: false,
      active_voucher_redeemed_at: null,
    })
    .eq('id', referrer.id);

  log.info('Created fresh referral voucher', {
    referrerId: referrer.id,
    amount,
    currency,
    couponId: coupon.id,
    code: promotionCode.code,
  });
}

/**
 * Accumulate reward onto existing voucher:
 * Delete old Stripe coupon, create new one with accumulated amount
 */
async function accumulateVoucher(
  stripe: Stripe,
  supabase: any,
  referrer: Referrer,
  newAmount: number,
  currency: string,
  config: ReferralConfig
): Promise<void> {
  // Delete old coupon (this also invalidates the old promotion code)
  if (referrer.active_voucher_stripe_coupon_id) {
    try {
      await stripe.coupons.del(referrer.active_voucher_stripe_coupon_id);
    } catch {
      log.warn('Failed to delete old coupon during accumulation', {
        couponId: referrer.active_voucher_stripe_coupon_id,
      });
      // Continue anyway — create new coupon
    }
  }

  // Create new coupon with accumulated amount
  await createFreshVoucher(stripe, supabase, referrer, newAmount, currency, config);

  log.info('Accumulated referral voucher', {
    referrerId: referrer.id,
    previousAmount: referrer.active_voucher_amount,
    newAmount,
  });
}
