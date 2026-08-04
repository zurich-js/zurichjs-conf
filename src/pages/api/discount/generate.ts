/**
 * Discount Code Generation API
 * POST: Creates a single-use Stripe coupon + promotion code for the discount popup.
 * Sets httpOnly cookies for the discount code and expiry.
 * Idempotent — if httpOnly cookies already present, returns existing data.
 *
 * The offer (percentage + duration) is resolved entirely server-side from the
 * admin config — the client sends only an email (the gate) and, for UTM
 * lottery visits, the lottery percentage (validated against lottery bounds).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { addNewsletterContact, sendDiscountCodeEmail } from '@/lib/email';
import { getStripeClient } from '@/lib/stripe/client';
import { getDiscountConfig } from '@/lib/discount/config-server';
import { createSingleUseDiscountCode } from '@/lib/discount/stripe-codes';
import { isValidLotteryPercent } from '@/lib/discount/utm-lottery';
import { isRecurringVisitor } from '@/lib/discount/visit-tracker';
import { logger } from '@/lib/logger';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import type { GenerateDiscountResponse } from '@/lib/discount/types';

const log = logger.scope('DiscountGenerate');

// Public unauthenticated endpoint that creates Stripe objects and sends
// outbound email — same tight per-IP budget as /api/cart/abandoned.
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

const bodySchema = z.object({
  /** The discount is email-gated: no email, no new code. */
  email: z.string().trim().email().max(254).optional(),
  /** UTM lottery percentage — validated against lottery bounds below */
  percentOff: z.number().optional(),
  /**
   * Visit count reported by the client, used to resolve the recurring-visitor
   * offer. Only the *count* is trusted, never a percentage: the offer value and
   * the threshold both come from admin config, re-checked here. The
   * downside of an inflated count is a visitor getting a slightly better
   * discount, which is the same exposure the UTM lottery already carries.
   */
  visitCount: z.number().int().min(1).max(10_000).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateDiscountResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { allowed } = limiter.check(getClientIp(req));
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const result = bodySchema.safeParse(
      typeof req.body === 'object' && req.body !== null ? req.body : {}
    );
    const body = result.success ? result.data : {};

    const isLotteryDiscount = isValidLotteryPercent(body.percentOff);

    // Check if a discount already exists in httpOnly cookies
    const existingCode = req.cookies.discount_code;
    const existingExpires = req.cookies.discount_expires_at;
    const existingPercentOff = req.cookies.discount_percent_off;

    if (existingCode && existingExpires) {
      const expiresAt = existingExpires;
      const remainingMs = new Date(expiresAt).getTime() - Date.now();
      if (remainingMs > 0) {
        log.info('Returning existing discount code', { code: existingCode });
        const config = await getDiscountConfig();
        const percentOff = existingPercentOff ? parseInt(existingPercentOff, 10) : config.percentOff;
        // The gate may re-collect an email for a code that already exists —
        // still deliver it to the inbox with the remaining validity.
        if (body.email) {
          await sendDiscountCodeEmail({
            to: body.email,
            code: existingCode,
            percentOff,
            validMinutes: Math.max(1, Math.round(remainingMs / 60_000)),
            expiresAtISO: new Date(expiresAt).toISOString(),
          });
        }
        return res.status(200).json({
          code: existingCode,
          expiresAt,
          percentOff,
        });
      }
    }

    // New codes are email-gated — the popup collects an email before the
    // code is generated. The existing-cookie path above stays email-free so
    // restored discounts keep working.
    if (!body.email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const config = await getDiscountConfig();
    const stripe = getStripeClient();

    // Threshold comes from admin config, never the client — the client only
    // reports how many visits it has seen.
    const isRecurring = isRecurringVisitor(body.visitCount ?? 0, config.recurringMinVisits);

    // Resolve the offer: lottery percentage wins, then the recurring-visitor
    // offer for someone on their 3rd+ visit, otherwise the standard popup offer
    // (the former aggressive-20 variant, stored in the ab fields).
    const percentOff = isLotteryDiscount
      ? body.percentOff!
      : isRecurring
        ? config.recurringPercentOff
        : config.abPercentOff;
    const durationMinutes = isLotteryDiscount
      ? config.durationMinutes
      : isRecurring
        ? config.recurringDurationMinutes
        : config.abDurationMinutes;

    const source = isLotteryDiscount
      ? 'utm_lottery'
      : isRecurring
        ? 'discount_popup_recurring'
        : 'discount_popup';

    const { code, couponId, promotionCodeId, expiresAt } = await createSingleUseDiscountCode(stripe, {
      percentOff,
      durationMinutes,
      namePrefix: isLotteryDiscount
        ? 'UTM Lottery'
        : isRecurring
          ? 'Discount Popup Recurring'
          : 'Discount Popup',
      metadata: {
        source,
        email: body.email,
      },
    });

    // The gate doubles as lead capture — add the email to the newsletter
    // audience, and send the code (with its expiry) to the inbox so the offer
    // survives a closed tab. Awaited: fire-and-forget promises are dropped
    // when the serverless function freezes after responding. Failures are
    // logged inside the helpers and never block the on-page code.
    await Promise.allSettled([
      addNewsletterContact(body.email, 'popup'),
      sendDiscountCodeEmail({
        to: body.email,
        code,
        percentOff,
        validMinutes: durationMinutes,
        expiresAtISO: expiresAt.toISOString(),
      }),
    ]);

    log.info('Generated discount code', {
      code,
      couponId,
      promotionCodeId,
      expiresAt: expiresAt.toISOString(),
      percentOff,
      isLottery: isLotteryDiscount,
      isRecurring,
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
