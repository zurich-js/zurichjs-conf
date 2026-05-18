/**
 * Stripe coupon + promotion code helpers for OSS maintainer tickets.
 *
 * Stripe payment links don't accept a `discounts` parameter directly — they
 * require either user-entered promotion codes or a `?prefilled_promo_code=`
 * query parameter on the URL. We use the latter for a frictionless customer
 * experience.
 *
 * Two layers:
 *   1. A stable per-tier *coupon* with `percent_off` (deterministic ID).
 *   2. A unique single-use *promotion code* per approved applicant, tied to
 *      that coupon, sent as `?prefilled_promo_code=<code>` on the payment URL.
 */

import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { retry } from '@/lib/retry';
import { logger } from '@/lib/logger';
import type { OssQualifyingTier } from './types';
import { OSS_TIER_DISCOUNT } from './types';

const log = logger.scope('OSS Coupons');

export function couponIdForTier(tier: OssQualifyingTier): string {
  return `oss_maintainer_${OSS_TIER_DISCOUNT[tier]}_off`;
}

export function couponNameForTier(tier: OssQualifyingTier): string {
  return `OSS Maintainer ${OSS_TIER_DISCOUNT[tier]}% Off`;
}

/**
 * Idempotently fetch or create the coupon for a given qualifying tier.
 */
export async function ensureCouponForTier(tier: OssQualifyingTier): Promise<Stripe.Coupon> {
  const stripe = getStripeClient();
  const id = couponIdForTier(tier);
  const percentOff = OSS_TIER_DISCOUNT[tier];

  try {
    return await retry(() => stripe.coupons.retrieve(id), {
      attempts: 2,
      label: 'stripe.coupons.retrieve',
      shouldRetry: (err) => {
        const code = (err as { code?: string })?.code;
        return code !== 'resource_missing';
      },
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== 'resource_missing') {
      log.error('Unexpected error retrieving OSS coupon', err, { id });
      throw err;
    }
  }

  log.info('Creating OSS maintainer coupon', { id, percentOff });
  return stripe.coupons.create({
    id,
    percent_off: percentOff,
    duration: 'once',
    name: couponNameForTier(tier),
    metadata: {
      kind: 'oss_maintainer',
      tier: String(tier),
    },
  });
}

/**
 * Build a deterministic short code from the verification ID — keeps codes
 * recognizable in Stripe and in user emails (e.g. `OSS-VER-ABCD1234`).
 */
function buildPromoCode(verificationCode: string): string {
  const sanitized = verificationCode.replace(/[^A-Z0-9-]/gi, '').toUpperCase().slice(0, 24);
  return `OSS-${sanitized}`;
}

/**
 * Create a single-use promotion code tied to the tier's coupon. Returns the
 * code string and the Stripe promotion code object.
 */
export async function createPromotionCodeForVerification(
  tier: OssQualifyingTier,
  verificationCode: string,
  customerEmail: string
): Promise<{ code: string; promotionCode: Stripe.PromotionCode; couponId: string }> {
  const stripe = getStripeClient();
  const coupon = await ensureCouponForTier(tier);
  const code = buildPromoCode(verificationCode);

  const promotionCode = await stripe.promotionCodes.create({
    promotion: {
      type: 'coupon',
      coupon: coupon.id,
    },
    code,
    max_redemptions: 1,
    metadata: {
      kind: 'oss_maintainer',
      tier: String(tier),
      verification_code: verificationCode,
      customer_email: customerEmail,
    },
  });

  return { code, promotionCode, couponId: coupon.id };
}
