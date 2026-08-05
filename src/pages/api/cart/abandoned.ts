/**
 * Cart Abandonment API Endpoint
 * Schedules a recovery email to be sent after a delay
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as React from 'react';
import { z } from 'zod';
import { render } from '@react-email/render';
import { CartAbandonmentEmail } from '@/emails/templates/CartAbandonmentEmail';
import type { CartAbandonmentEmailProps, CartAbandonmentDiscount } from '@/emails/templates/CartAbandonmentEmail';
import { getBaseUrl } from '@/lib/url';
import { serverAnalytics } from '@/lib/analytics/server';
import { createSingleUseDiscountCode } from '@/lib/discount/stripe-codes';
import { createServiceRoleClient } from '@/lib/supabase';
import { getResendClient, EMAIL_CONFIG } from '@/lib/email';
import { logger } from '@/lib/logger';
import { notifyCartAbandonment } from '@/lib/platform-notifications';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getStripeClient } from '@/lib/stripe/client';

const log = logger.scope('Cart Abandonment');

interface RecoveryTouch {
  delayHours: number;
  subject: string;
  includeGoodie: boolean;
}

/**
 * Passive abandonment: a short-delay nudge while the decision is still warm
 * (buyers revisit the cart ~4x before purchasing), and a 24h follow-up.
 * Scheduled touches are cancelled when the purchase completes.
 */
const FOLLOW_UP_TOUCH: RecoveryTouch = {
  delayHours: 24,
  subject: 'Did you forget something? Your tickets are waiting!',
  includeGoodie: false,
};

const ABANDONMENT_TOUCHES: RecoveryTouch[] = [
  { delayHours: 1, subject: 'Your ZurichJS cart is saved — still deciding?', includeGoodie: false },
  FOLLOW_UP_TOUCH,
];

/**
 * Thank-you code attached to the immediate email when the user explicitly
 * saves their cart. Deliberately not advertised in the UI — it's a surprise
 * in the inbox, so saving a cart never becomes a routine discount path.
 */
const GOODIE_PERCENT_OFF = 10;
const GOODIE_VALID_HOURS = 2;

// Public unauthenticated endpoint that triggers outbound email — keep the
// per-IP budget tight. Legit clients fire at most once per session.
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

const bodySchema = z.object({
  // Lower-cased on the way in: the purchase webhook cancels scheduled touches
  // with an exact `.eq('email', ...)` match, so a visitor who typed
  // "Ada@Example.com" here and "ada@example.com" at checkout used to keep
  // receiving "you forgot something" mail after buying.
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().max(100).optional(),
  cartItems: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(20),
        price: z.number().min(0).max(100_000),
        currency: z.string().length(3),
      })
    )
    .min(1)
    .max(40),
  cartTotal: z.number().min(0).max(1_000_000),
  currency: z.string().length(3),
  /** Encoded cart state for URL reconstruction — base64url alphabet only.
   *  Sized for large mixed carts (~300-350 chars per line item). */
  encodedCartState: z.string().max(16_000).regex(/^[A-Za-z0-9\-_]*$/).optional(),
  /** True when the user explicitly saved their cart — the first email sends
   *  immediately and carries the thank-you discount code. */
  immediate: z.boolean().optional(),
});

interface CartAbandonedResponse {
  success: boolean;
  message?: string;
  error?: string;
  emailId?: string;
  scheduledFor?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CartAbandonedResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const { allowed } = limiter.check(getClientIp(req));
  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
    });
  }

  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
      });
    }
    const { email, firstName, cartItems, cartTotal, currency, encodedCartState, immediate } = parsed.data;

    const resend = getResendClient();

    // Explicit saves get a surprise thank-you code in the immediate email.
    // Optional: if Stripe is down the save-cart email still goes out.
    let goodie: CartAbandonmentDiscount | null = null;
    if (immediate) {
      try {
        const { code } = await createSingleUseDiscountCode(getStripeClient(), {
          percentOff: GOODIE_PERCENT_OFF,
          durationMinutes: GOODIE_VALID_HOURS * 60,
          namePrefix: 'Cart Save',
          metadata: { source: 'cart_save_goodie', email },
        });
        goodie = { code, percentOff: GOODIE_PERCENT_OFF, validHours: GOODIE_VALID_HOURS };
      } catch (goodieError) {
        log.error('Failed to create save-cart goodie code', goodieError, { email });
      }
    }

    const touches: RecoveryTouch[] = immediate
      ? [
          {
            delayHours: 0,
            subject: goodie
              ? `Your saved cart — plus ${GOODIE_PERCENT_OFF}% off for the next ${GOODIE_VALID_HOURS} hours`
              : 'Your saved ZurichJS cart',
            includeGoodie: goodie !== null,
          },
          FOLLOW_UP_TOUCH,
        ]
      : ABANDONMENT_TOUCHES;

    // Build full cart recovery URL with encoded state
    const baseUrl = getBaseUrl(req);
    const cartRecoveryUrl = encodedCartState
      ? `${baseUrl}/cart?cart=${encodedCartState}&utm_source=email&utm_medium=abandonment&utm_campaign=cart_recovery`
      : `${baseUrl}/cart`;

    // Render the email template per touch variant: only the immediate touch
    // carries the goodie (it expires long before any follow-up lands). The
    // goodie variant's cart link embeds the code so /cart auto-applies it.
    const baseProps: CartAbandonmentEmailProps = {
      firstName,
      cartItems,
      cartTotal,
      currency,
      cartUrl: cartRecoveryUrl,
    };
    const baseHtml = await render(React.createElement(CartAbandonmentEmail, baseProps));
    const goodieHtml = goodie
      ? await render(React.createElement(CartAbandonmentEmail, {
          ...baseProps,
          cartUrl: `${cartRecoveryUrl}${cartRecoveryUrl.includes('?') ? '&' : '?'}voucher=${goodie.code}`,
          discount: goodie,
        }))
      : baseHtml;

    // Send/schedule the recovery touches
    const sent: Array<{ id: string; scheduledFor: string; cancellable: boolean }> = [];
    let firstError: string | null = null;
    for (const touch of touches) {
      const isImmediate = touch.delayHours === 0;
      const scheduledAt = new Date(Date.now() + touch.delayHours * 60 * 60 * 1000);
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to: email,
        subject: touch.subject,
        html: touch.includeGoodie ? goodieHtml : baseHtml,
        // Immediate touches send right away; scheduled ones can be cancelled
        ...(isImmediate ? {} : { scheduledAt: scheduledAt.toISOString() }),
      });

      if (result.error || !result.data?.id) {
        firstError ??= result.error?.message || 'Failed to schedule email';
        log.error('Failed to send recovery touch', result.error, { delayHours: touch.delayHours });
        continue;
      }
      sent.push({ id: result.data.id, scheduledFor: scheduledAt.toISOString(), cancellable: !isImmediate });
    }

    if (sent.length === 0) {
      return res.status(500).json({
        success: false,
        error: firstError || 'Failed to schedule email',
      });
    }

    // Store scheduled (still-cancellable) email IDs in Supabase so a completed
    // purchase can cancel them. Immediate sends are already delivered.
    const cancellable = sent.filter((touch) => touch.cancellable);
    try {
      const supabase = createServiceRoleClient();

      // First, cancel any existing scheduled emails for this user (only keep latest sequence)
      const { data: existingEmails } = await supabase
        .from('scheduled_abandonment_emails')
        .select('resend_email_id')
        .eq('email', email);

      if (existingEmails && existingEmails.length > 0) {
        // Cancel previous scheduled emails in Resend
        for (const existing of existingEmails) {
          try {
            await resend.emails.cancel(existing.resend_email_id);
          } catch {
            // Ignore errors cancelling old emails (may already be sent/cancelled)
          }
        }
        // Delete old records
        await supabase
          .from('scheduled_abandonment_emails')
          .delete()
          .eq('email', email);
      }

      if (cancellable.length > 0) {
        // Insert one record per scheduled touch
        await supabase
          .from('scheduled_abandonment_emails')
          .insert(cancellable.map((touch) => ({
            email,
            resend_email_id: touch.id,
            scheduled_for: touch.scheduledFor,
          })));
      }
    } catch (storageError) {
      // Non-fatal: log but don't fail the request
      log.error('Failed to store email IDs for cancellation', storageError);
    }

    // Track email scheduled event in PostHog
    await serverAnalytics.track('cart_abandonment_email_scheduled', email, {
      email_id: sent[0].id,
      scheduled_for: sent[0].scheduledFor,
      touch_count: sent.length,
      cart_recovery_url: cartRecoveryUrl,
      cart_item_count: cartItems.length,
      cart_total_amount: cartTotal,
      cart_currency: currency,
      cart_items: cartItems.map((item) => ({
        type: item.title.includes('Workshop') ? 'workshop' as const : 'ticket' as const,
        quantity: item.quantity,
        price: item.price,
      })),
      email,
      first_name: firstName,
    });

    // Flush analytics to ensure event is sent before response
    await serverAnalytics.flush();

    // Send Slack notification for cart abandonment
    notifyCartAbandonment({
      cartId: sent[0].id,
      buyerEmail: email,
      itemsSummary: cartItems.map(item => `${item.quantity}x ${item.title}`).join(', '),
      currency,
      amount: Math.round(cartTotal * 100), // convert to cents
    });

    log.info('Recovery emails scheduled successfully', {
      emailIds: sent.map((touch) => touch.id),
      to: email,
      immediate: Boolean(immediate),
      hasGoodie: goodie !== null,
      cartRecoveryUrl,
    });

    return res.status(200).json({
      success: true,
      message: 'Abandonment emails scheduled',
      emailId: sent[0].id,
      scheduledFor: sent[0].scheduledFor,
    });
  } catch (error) {
    log.error('Error processing cart abandonment', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to schedule abandonment email';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
