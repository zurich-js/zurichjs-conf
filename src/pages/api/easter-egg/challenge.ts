/**
 * Easter Egg Partner Challenge
 *
 * GET  /api/easter-egg/challenge        — Returns partner list (no answers)
 * POST /api/easter-egg/challenge        — Validates answer & mints discount
 *      Body: { partnerId: string, answer: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { logger } from '@/lib/logger';
import { getStripeClient } from '@/lib/stripe/client';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import {
  getEasterEggConfig,
  getChallengeConfig,
  getPartners,
  validateAnswer,
} from '@/lib/easter-egg';
import type { ChallengeClaimResponse, EasterEggPartner, ErrorResponse } from '@/lib/easter-egg';

const log = logger.scope('EasterEggChallenge');

// Rate limiter: 5 attempts per minute per IP (more generous for challenge attempts)
const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
});

// Daily claim counter (resets on deploy or at midnight)
let dailyClaimCount = 0;
let dailyClaimDate = new Date().toDateString();

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 8;
  const bytes = randomBytes(length);
  let code = 'CHG';
  for (let i = 0; i < length - 3; i++) {
    const idx = bytes[i] % chars.length;
    code += chars.charAt(idx);
  }
  return code;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChallengeClaimResponse | { partners: EasterEggPartner[] } | ErrorResponse>
) {
  const config = getEasterEggConfig();

  if (!config.enabled) {
    return res.status(404).json({ error: 'Not found' });
  }

  // GET: return partner list
  if (req.method === 'GET') {
    return res.status(200).json({ partners: getPartners() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const rateLimit = rateLimiter.check(ip);

  if (!rateLimit.allowed) {
    log.warn('Rate limit exceeded for challenge', { ip });
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return res.status(429).json({
      error: 'Too many attempts! Try again in a minute.',
      retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
    });
  }

  const { partnerId, answer } = req.body || {};

  if (!partnerId || typeof partnerId !== 'string' || !answer || typeof answer !== 'string') {
    return res.status(400).json({ error: 'Missing partnerId or answer' });
  }

  // Validate the answer
  const result = validateAnswer(partnerId, answer);

  if (!result.valid) {
    log.info('Wrong challenge answer', { partnerId, ip });
    return res.status(400).json({ error: "That's not quite right. Double-check and try again!" });
  }

  // Check for existing challenge claim cookie
  const existingCode = req.cookies.easter_egg_challenge_code;
  const existingExpires = req.cookies.easter_egg_challenge_expires_at;

  if (existingCode && existingExpires) {
    const expiresAt = existingExpires;
    if (new Date(expiresAt) > new Date()) {
      const challengeConfig = getChallengeConfig();
      log.info('Returning existing challenge code', { code: existingCode, ip });
      return res.status(200).json({
        code: existingCode,
        expiresAt,
        percentOff: challengeConfig.challengePercentOff,
        message: `You already completed a challenge! Your ${challengeConfig.challengePercentOff}% code is still valid.`,
        partnerName: result.partnerName!,
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
    return res.status(429).json({ error: "Today's challenges are all claimed. Come back tomorrow!" });
  }

  try {
    const stripe = getStripeClient();
    const challengeConfig = getChallengeConfig();
    const code = generateUniqueCode();
    const expiresAt = new Date(Date.now() + challengeConfig.challengeTokenExpiryMinutes * 60 * 1000);
    const redeemBy = Math.floor(expiresAt.getTime() / 1000);

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      percent_off: challengeConfig.challengePercentOff,
      duration: 'once',
      max_redemptions: 1,
      redeem_by: redeemBy,
      name: `Partner Challenge: ${code}`,
      metadata: {
        source: 'easter_egg_challenge',
        partner_id: partnerId,
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
          source: 'easter_egg_challenge',
          partner_id: partnerId,
        },
      });
    } catch (err) {
      await stripe.coupons.del(coupon.id);
      throw err;
    }

    // Increment daily counter
    dailyClaimCount++;

    log.info('Challenge code generated', {
      code,
      couponId: coupon.id,
      promotionCodeId: promotionCode.id,
      partnerId,
      expiresAt: expiresAt.toISOString(),
      dailyCount: dailyClaimCount,
      ip,
    });

    // Set httpOnly cookies
    const expiresAtISO = expiresAt.toISOString();
    const maxAgeSeconds = challengeConfig.challengeTokenExpiryMinutes * 60;
    const isSecure = process.env.NODE_ENV === 'production';
    const commonCookieAttributes = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isSecure ? '; Secure' : ''}`;

    res.setHeader('Set-Cookie', [
      `easter_egg_challenge_code=${code}; ${commonCookieAttributes}`,
      `easter_egg_challenge_expires_at=${expiresAtISO}; ${commonCookieAttributes}`,
    ]);

    return res.status(200).json({
      code,
      expiresAt: expiresAtISO,
      percentOff: challengeConfig.challengePercentOff,
      message: 'Challenge completed!',
      partnerName: result.partnerName!,
    });
  } catch (error) {
    log.error('Failed to generate challenge code', error as Error);
    return res.status(500).json({ error: 'Oops, something broke. Try again?' });
  }
}
