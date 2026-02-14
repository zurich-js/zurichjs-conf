/**
 * Easter Egg Discount Claim
 *
 * POST /api/easter-egg/claim
 *
 * Mints a single-use discount token for DevTools users.
 * Protected by rate limiting and cookies.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { logger } from '@/lib/logger';
import { getStripeClient } from '@/lib/stripe/client';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getEasterEggConfig } from '@/lib/easter-egg';
import type { ClaimResponse, ErrorResponse } from '@/lib/easter-egg';

const log = logger.scope('EasterEggClaim');

// Rate limiter: 3 claims per minute per IP
const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 3,
});

// Daily claim counter (resets on deploy or at midnight)
let dailyClaimCount = 0;
let dailyClaimDate = new Date().toDateString();

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 8;
  const bytes = randomBytes(length);
  let code = 'DEV';
  for (let i = 0; i < length - 3; i++) {
    const idx = bytes[i] % chars.length;
    code += chars.charAt(idx);
  }
  return code;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClaimResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = getEasterEggConfig();

  // Check if feature is enabled
  if (!config.enabled) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const rateLimit = rateLimiter.check(ip);

  if (!rateLimit.allowed) {
    log.warn('Rate limit exceeded for claim', { ip });
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return res.status(429).json({
      error: 'Whoa, slow down! Try again in a minute.',
      retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
    });
  }

  // Check for existing claim cookie (idempotent - return existing code)
  const existingCode = req.cookies.easter_egg_code;
  const existingExpires = req.cookies.easter_egg_expires_at;

  if (existingCode && existingExpires) {
    const expiresAt = existingExpires;
    if (new Date(expiresAt) > new Date()) {
      log.info('Returning existing easter egg code', { code: existingCode, ip });
      return res.status(200).json({
        code: existingCode,
        expiresAt,
        percentOff: config.percentOff,
        message: `You already claimed this one! Your ${config.percentOff}% code is still valid.`,
      });
    }
  }

  // Check daily cap
  const today = new Date().toDateString();
  if (today !== dailyClaimDate) {
    dailyClaimCount = 0;
    dailyClaimDate = today;
  }

  if (config.dailyClaimCap > 0 && dailyClaimCount >= config.dailyClaimCap) {
    log.warn('Daily cap reached', { dailyClaimCount, cap: config.dailyClaimCap });
    return res.status(429).json({ error: "Today's rewards are all claimed. Come back tomorrow!" });
  }

  try {
    const stripe = getStripeClient();
    const code = generateUniqueCode();
    const expiresAt = new Date(Date.now() + config.tokenExpiryMinutes * 60 * 1000);
    const redeemBy = Math.floor(expiresAt.getTime() / 1000);

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      percent_off: config.percentOff,
      duration: 'once',
      max_redemptions: 1,
      redeem_by: redeemBy,
      name: `DevTools Reward: ${code}`,
      metadata: {
        source: 'easter_egg',
        generated_at: new Date().toISOString(),
      },
    });

    // Create promotion code
    let promotionCode;
    try {
      promotionCode = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: coupon.id },
        code,
        max_redemptions: 1,
        expires_at: redeemBy,
        metadata: {
          source: 'easter_egg',
        },
      });
    } catch (err) {
      // Clean up coupon if promotion code creation fails
      await stripe.coupons.del(coupon.id);
      throw err;
    }

    // Increment daily counter
    dailyClaimCount++;

    log.info('Easter egg code generated', {
      code,
      couponId: coupon.id,
      promotionCodeId: promotionCode.id,
      expiresAt: expiresAt.toISOString(),
      ip,
      dailyCount: dailyClaimCount,
    });

    // Set httpOnly cookies
    const expiresAtISO = expiresAt.toISOString();
    const maxAgeSeconds = config.tokenExpiryMinutes * 60;
    const isSecure = process.env.NODE_ENV === 'production';
    const commonCookieAttributes = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isSecure ? '; Secure' : ''}`;

    res.setHeader('Set-Cookie', [
      `easter_egg_code=${code}; ${commonCookieAttributes}`,
      `easter_egg_expires_at=${expiresAtISO}; ${commonCookieAttributes}`,
    ]);

    return res.status(200).json({
      code,
      expiresAt: expiresAtISO,
      percentOff: config.percentOff,
      message: `You found it!`,
    });
  } catch (error) {
    log.error('Failed to generate easter egg code', error as Error);
    return res.status(500).json({ error: 'Oops, something broke. Try again?' });
  }
}
