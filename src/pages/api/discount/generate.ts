/**
 * Discount Code Generation API
 * POST: Creates a single-use Stripe coupon + promotion code for the discount popup.
 * Sets httpOnly cookies for the discount code and expiry.
 * Idempotent — if httpOnly cookies already present, returns existing data.
 *
 * Accepts optional `percentOff` in request body for UTM lottery discounts, and
 * an optional `variant` (A/B/C experiment key) plus a `priceSensitivityReason`
 * (stored as Stripe metadata for analysis). Only the variant *key* is trusted:
 * the percentage and duration for each variant are resolved server-side.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getStripeClient } from '@/lib/stripe/client';
import { getServerConfig } from '@/lib/discount/config';
import {
  DISCOUNT_VARIANTS,
  getVariantServerConfig,
} from '@/lib/discount/experiment';
import { PRICE_SENSITIVITY_REASONS } from '@/lib/discount/price-sensitivity';
import { isValidLotteryPercent } from '@/lib/discount/utm-lottery';
import { logger } from '@/lib/logger';
import type { GenerateDiscountResponse } from '@/lib/discount/types';
import { randomBytes } from 'crypto';

const log = logger.scope('DiscountGenerate');

const bodySchema = z.object({
  percentOff: z.number().optional(),
  variant: z.enum(DISCOUNT_VARIANTS).optional(),
  /** Why the visitor qualified for price-sensitive-30 (metadata only) */
  priceSensitivityReason: z.enum(PRICE_SENSITIVITY_REASONS).nullish(),
});

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 8;
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    const idx = bytes[i] % chars.length;
    code += chars.charAt(idx);
  }
  return code;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateDiscountResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = bodySchema.safeParse(
      typeof req.body === 'object' && req.body !== null ? req.body : {}
    );
    const body = result.success ? result.data : {};

    const isLotteryDiscount = isValidLotteryPercent(body.percentOff);
    const variant = !isLotteryDiscount ? body.variant : undefined;
    const priceSensitivityReason =
      variant === 'price-sensitive-30' ? body.priceSensitivityReason ?? undefined : undefined;

    // Check if a discount already exists in httpOnly cookies
    const existingCode = req.cookies.discount_code;
    const existingExpires = req.cookies.discount_expires_at;
    const existingPercentOff = req.cookies.discount_percent_off;

    if (existingCode && existingExpires) {
      const expiresAt = existingExpires;
      if (new Date(expiresAt) > new Date()) {
        log.info('Returning existing discount code', { code: existingCode });
        const config = getServerConfig();
        return res.status(200).json({
          code: existingCode,
          expiresAt,
          percentOff: existingPercentOff ? parseInt(existingPercentOff, 10) : config.percentOff,
        });
      }
    }

    const config = getServerConfig();
    const stripe = getStripeClient();
    const code = generateUniqueCode();

    // Resolve the offer: lottery percentage wins, then experiment variant,
    // then the default (control) config. Duration always comes from the server.
    const offer = variant
      ? getVariantServerConfig(variant)
      : { percentOff: config.percentOff, durationMinutes: config.durationMinutes };
    const percentOff = isLotteryDiscount ? body.percentOff! : offer.percentOff;
    const durationMinutes = isLotteryDiscount
      ? config.durationMinutes
      : offer.durationMinutes;

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const redeemBy = Math.floor(expiresAt.getTime() / 1000);

    const source = isLotteryDiscount ? 'utm_lottery' : 'discount_popup';

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: 'once',
      max_redemptions: 1,
      redeem_by: redeemBy,
      name: `${isLotteryDiscount ? 'UTM Lottery' : 'Discount Popup'}: ${code}`,
      metadata: {
        source,
        ...(variant ? { experiment_variant: variant } : {}),
        ...(priceSensitivityReason
          ? { price_sensitivity_reason: priceSensitivityReason }
          : {}),
        generated_at: new Date().toISOString(),
      },
    });

    // Create promotion code for the coupon
    let promotionCode;
    try {
      promotionCode = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: coupon.id },
        code,
        max_redemptions: 1,
        expires_at: redeemBy,
        metadata: {
          source,
          ...(variant ? { experiment_variant: variant } : {}),
          ...(priceSensitivityReason
            ? { price_sensitivity_reason: priceSensitivityReason }
            : {}),
        },
      });
    } catch (err) {
      // Clean up coupon if promotion code creation fails
      await stripe.coupons.del(coupon.id);
      throw err;
    }

    log.info('Generated discount code', {
      code,
      couponId: coupon.id,
      promotionCodeId: promotionCode.id,
      expiresAt: expiresAt.toISOString(),
      percentOff,
      isLottery: isLotteryDiscount,
      experimentVariant: variant,
      priceSensitivityReason,
    });

    const expiresAtISO = expiresAt.toISOString();
    const maxAgeSeconds = durationMinutes * 60;
    const isSecure = process.env.NODE_ENV === 'production';
    const commonCookieAttributes = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isSecure ? '; Secure' : ''}`;

    // Set httpOnly cookies (include percentOff for restoration)
    res.setHeader('Set-Cookie', [
      `discount_code=${code}; ${commonCookieAttributes}`,
      `discount_expires_at=${expiresAtISO}; ${commonCookieAttributes}`,
      `discount_percent_off=${percentOff}; ${commonCookieAttributes}`,
    ]);

    return res.status(200).json({
      code,
      expiresAt: expiresAtISO,
      percentOff,
    });
  } catch (err) {
    log.error('Failed to generate discount code', err as Error);
    return res.status(500).json({ error: 'Failed to generate discount code' });
  }
}
