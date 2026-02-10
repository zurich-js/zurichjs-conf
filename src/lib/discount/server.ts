/**
 * Server-side Discount Generation
 *
 * Handles eligibility checks and code generation on the server
 * to avoid exposing logic to the client.
 */

import type { GetServerSidePropsContext } from 'next';
import { getStripeClient } from '@/lib/stripe/client';
import { getServerConfig, COOKIE_NAMES } from './config';
import { logger } from '@/lib/logger';
import type { DiscountData } from './types';

const log = logger.scope('DiscountServer');

/**
 * FNV-1a hash for strings → 32-bit unsigned integer
 */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate fingerprint from request headers
 */
function getServerFingerprint(ctx: GetServerSidePropsContext): number {
  const userAgent = ctx.req.headers['user-agent'] || '';
  const acceptLanguage = ctx.req.headers['accept-language'] || '';
  const ip = ctx.req.headers['x-forwarded-for'] || ctx.req.socket.remoteAddress || '';

  const signals = [userAgent, acceptLanguage, String(ip)].join('|');
  return fnv1a(signals);
}

/**
 * Generate a unique discount code
 */
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Parse cookies from request
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, decodeURIComponent(val.join('='))];
    })
  );
}

export interface ServerDiscountResult {
  discountData: DiscountData | null;
  cookies: string[];
}

/**
 * Check eligibility and generate discount code server-side
 */
export async function getServerSideDiscount(
  ctx: GetServerSidePropsContext
): Promise<ServerDiscountResult> {
  const config = getServerConfig();
  const cookies = parseCookies(ctx.req.headers.cookie);
  const setCookies: string[] = [];

  // Check for force show (dev/testing)
  const forceShow = config.forceShow;

  // Check if already has a valid discount
  const existingCode = cookies.discount_code;
  const existingExpires = cookies.discount_expires_at;

  if (existingCode && existingExpires) {
    const expiresAt = existingExpires;
    if (new Date(expiresAt) > new Date()) {
      // Return existing discount
      return {
        discountData: {
          code: existingCode,
          expiresAt,
          percentOff: config.percentOff,
        },
        cookies: [],
      };
    }
  }

  // Check cooldown cookie (skip if force show)
  if (!forceShow && cookies[COOKIE_NAMES.COOLDOWN]) {
    return { discountData: null, cookies: [] };
  }

  // Check eligibility with PRNG (skip if force show)
  if (!forceShow) {
    const seed = getServerFingerprint(ctx);
    const rng = mulberry32(seed);
    const selected = rng() < config.showProbability;

    if (!selected) {
      // Set cooldown cookie
      const cooldownMaxAge = config.cooldownHours * 3600;
      setCookies.push(
        `${COOKIE_NAMES.COOLDOWN}=1; Path=/; Max-Age=${cooldownMaxAge}; SameSite=Lax`
      );
      return { discountData: null, cookies: setCookies };
    }
  }

  // Generate discount code
  try {
    const stripe = getStripeClient();
    const code = generateUniqueCode();
    const expiresAt = new Date(Date.now() + config.durationMinutes * 60 * 1000);
    const redeemBy = Math.floor(expiresAt.getTime() / 1000);
    const maxAgeSeconds = config.durationMinutes * 60;

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

    // Create promotion code
    await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
      max_redemptions: 1,
      expires_at: redeemBy,
      metadata: {
        source: 'discount_popup',
      },
    });

    const expiresAtISO = expiresAt.toISOString();

    log.info('Generated discount code server-side', { code, expiresAt: expiresAtISO });

    // Set cookies
    setCookies.push(
      `discount_code=${code}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
      `discount_expires_at=${expiresAtISO}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
      `${COOKIE_NAMES.COOLDOWN}=1; Path=/; Max-Age=${config.cooldownHours * 3600}; SameSite=Lax`
    );

    return {
      discountData: {
        code,
        expiresAt: expiresAtISO,
        percentOff: config.percentOff,
      },
      cookies: setCookies,
    };
  } catch (err) {
    log.error('Failed to generate discount code server-side', err as Error);
    return { discountData: null, cookies: [] };
  }
}
