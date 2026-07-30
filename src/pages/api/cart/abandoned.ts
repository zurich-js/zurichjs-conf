/**
 * Cart Abandonment API Endpoint
 * Schedules a recovery email to be sent after a delay
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as React from 'react';
import { z } from 'zod';
import { render } from '@react-email/render';
import { CartAbandonmentEmail } from '@/emails/templates/CartAbandonmentEmail';
import type { CartAbandonmentEmailProps } from '@/emails/templates/CartAbandonmentEmail';
import { getBaseUrl } from '@/lib/url';
import { serverAnalytics } from '@/lib/analytics/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getResendClient, EMAIL_CONFIG } from '@/lib/email';
import { logger } from '@/lib/logger';
import { notifyCartAbandonment } from '@/lib/platform-notifications';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const log = logger.scope('Cart Abandonment');

/**
 * Two-touch recovery sequence: a short-delay nudge while the decision is
 * still warm (buyers revisit the cart ~4x before purchasing), and a 24h
 * follow-up. Every touch is cancelled when the purchase completes.
 */
const RECOVERY_TOUCHES = [
  { delayHours: 1, subject: 'Your ZurichJS cart is saved — still deciding?' },
  { delayHours: 24, subject: 'Did you forget something? Your tickets are waiting!' },
] as const;

// Public unauthenticated endpoint that triggers outbound email — keep the
// per-IP budget tight. Legit clients fire at most once per session.
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
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
    .max(20),
  cartTotal: z.number().min(0).max(1_000_000),
  currency: z.string().length(3),
  /** Encoded cart state for URL reconstruction — base64url alphabet only */
  encodedCartState: z.string().max(4_000).regex(/^[A-Za-z0-9\-_]*$/).optional(),
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
    const { email, firstName, cartItems, cartTotal, currency, encodedCartState } = parsed.data;

    const resend = getResendClient();

    // Build full cart recovery URL with encoded state
    const baseUrl = getBaseUrl(req);
    const cartRecoveryUrl = encodedCartState
      ? `${baseUrl}/cart?cart=${encodedCartState}&utm_source=email&utm_medium=abandonment&utm_campaign=cart_recovery`
      : `${baseUrl}/cart`;

    // Prepare email props
    const emailProps: CartAbandonmentEmailProps = {
      firstName,
      cartItems,
      cartTotal,
      currency,
      cartUrl: cartRecoveryUrl,
    };

    // Render the email template (same body for every touch)
    const emailHtml = await render(
      React.createElement(CartAbandonmentEmail, emailProps)
    );

    // Schedule the recovery touches
    const scheduled: Array<{ id: string; scheduledFor: string }> = [];
    let firstError: string | null = null;
    for (const touch of RECOVERY_TOUCHES) {
      const scheduledAt = new Date(Date.now() + touch.delayHours * 60 * 60 * 1000);
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to: email,
        subject: touch.subject,
        html: emailHtml,
        scheduledAt: scheduledAt.toISOString(),
      });

      if (result.error || !result.data?.id) {
        firstError ??= result.error?.message || 'Failed to schedule email';
        log.error('Failed to schedule recovery touch', result.error, { delayHours: touch.delayHours });
        continue;
      }
      scheduled.push({ id: result.data.id, scheduledFor: scheduledAt.toISOString() });
    }

    if (scheduled.length === 0) {
      return res.status(500).json({
        success: false,
        error: firstError || 'Failed to schedule email',
      });
    }

    // Store the scheduled email IDs in Supabase for cancellation on successful purchase
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

      // Insert one record per scheduled touch
      await supabase
        .from('scheduled_abandonment_emails')
        .insert(scheduled.map((touch) => ({
          email,
          resend_email_id: touch.id,
          scheduled_for: touch.scheduledFor,
        })));
    } catch (storageError) {
      // Non-fatal: log but don't fail the request
      log.error('Failed to store email IDs for cancellation', storageError);
    }

    // Track email scheduled event in PostHog
    await serverAnalytics.track('cart_abandonment_email_scheduled', email, {
      email_id: scheduled[0].id,
      scheduled_for: scheduled[0].scheduledFor,
      touch_count: scheduled.length,
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
      cartId: scheduled[0].id,
      buyerEmail: email,
      itemsSummary: cartItems.map(item => `${item.quantity}x ${item.title}`).join(', '),
      currency,
      amount: Math.round(cartTotal * 100), // convert to cents
    });

    log.info('Recovery emails scheduled successfully', {
      emailIds: scheduled.map((touch) => touch.id),
      to: email,
      cartRecoveryUrl,
    });

    return res.status(200).json({
      success: true,
      message: 'Abandonment emails scheduled',
      emailId: scheduled[0].id,
      scheduledFor: scheduled[0].scheduledFor,
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
