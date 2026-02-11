/**
 * Discount Code Generation API
 * POST: Creates a single-use Stripe coupon + promotion code for the discount popup.
 * Sets httpOnly cookies for the discount code and expiry.
 * Idempotent — if httpOnly cookies already present, returns existing data.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripeClient } from '@/lib/stripe/client';
import { getServerConfig } from '@/lib/discount/config';
import { logger } from '@/lib/logger';
import type { GenerateDiscountResponse } from '@/lib/discount/types';
import { randomBytes } from 'crypto';

const log = logger.scope('DiscountGenerate');

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
    // Check if a discount already exists in httpOnly cookies
    const existingCode = req.cookies.discount_code;
    const existingExpires = req.cookies.discount_expires_at;

    if (existingCode && existingExpires) {
      const expiresAt = existingExpires;
      if (new Date(expiresAt) > new Date()) {
        log.info('Returning existing discount code', { code: existingCode });
        const config = getServerConfig();
        return res.status(200).json({
          code: existingCode,
          expiresAt,
          percentOff: config.percentOff,
        });
      }
    }

    const config = getServerConfig();
    const stripe = getStripeClient();
    const code = generateUniqueCode();
    const expiresAt = new Date(Date.now() + config.durationMinutes * 60 * 1000);
    const redeemBy = Math.floor(expiresAt.getTime() / 1000);

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      percent_off: config.percentOff,
      duration: 'once',
      max_redemptions: 1,
      redeem_by: redeemBy,
      name: `Discount Popup: ${code}`,
      metadata: {
        source: 'discount_popup',
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
          source: 'discount_popup',
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
    });

    const expiresAtISO = expiresAt.toISOString();
    const maxAgeSeconds = config.durationMinutes * 60;
    const isSecure = process.env.NODE_ENV === 'production';
    const commonCookieAttributes = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isSecure ? '; Secure' : ''}`;

    // Set httpOnly cookies
    res.setHeader('Set-Cookie', [
      `discount_code=${code}; ${commonCookieAttributes}`,
      `discount_expires_at=${expiresAtISO}; ${commonCookieAttributes}`,
    ]);

    return res.status(200).json({
      code,
      expiresAt: expiresAtISO,
      percentOff: config.percentOff,
    });
  } catch (err) {
    log.error('Failed to generate discount code', err as Error);
    return res.status(500).json({ error: 'Failed to generate discount code' });
  }
}
