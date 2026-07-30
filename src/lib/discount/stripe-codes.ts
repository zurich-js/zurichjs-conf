/**
 * Single-use Stripe discount codes (server-only)
 *
 * Shared by the discount popup (/api/discount/generate) and the save-cart
 * goodie email (/api/cart/abandoned). Creates a one-off coupon plus a
 * matching promotion code with a redeem-by deadline; cleans up the coupon
 * if the promotion code can't be created.
 *
 * Do NOT export this module from the discount barrel (index.ts) — it is
 * server-only and must never reach a client bundle.
 */

import type Stripe from 'stripe';
import { randomInt } from 'crypto';

/** Unambiguous alphabet (no I/O/0/1) for human-typed codes */
export function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 8;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(randomInt(chars.length));
  }
  return code;
}

export interface SingleUseDiscountOptions {
  percentOff: number;
  durationMinutes: number;
  /** Coupon display-name prefix, e.g. 'Discount Popup' */
  namePrefix: string;
  /** Attribution metadata stored on both the coupon and the promotion code */
  metadata?: Record<string, string>;
}

export interface SingleUseDiscountCode {
  code: string;
  couponId: string;
  promotionCodeId: string;
  expiresAt: Date;
}

export async function createSingleUseDiscountCode(
  stripe: Stripe,
  { percentOff, durationMinutes, namePrefix, metadata = {} }: SingleUseDiscountOptions
): Promise<SingleUseDiscountCode> {
  const code = generateUniqueCode();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const redeemBy = Math.floor(expiresAt.getTime() / 1000);

  const coupon = await stripe.coupons.create({
    percent_off: percentOff,
    duration: 'once',
    max_redemptions: 1,
    redeem_by: redeemBy,
    name: `${namePrefix}: ${code}`,
    metadata: {
      ...metadata,
      generated_at: new Date().toISOString(),
    },
  });

  try {
    const promotionCode = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
      max_redemptions: 1,
      expires_at: redeemBy,
      metadata,
    });
    return { code, couponId: coupon.id, promotionCodeId: promotionCode.id, expiresAt };
  } catch (err) {
    // Clean up the coupon if promotion code creation fails
    await stripe.coupons.del(coupon.id);
    throw err;
  }
}
