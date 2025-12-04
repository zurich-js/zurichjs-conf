/**
 * Cart Abandonment API Endpoint
 * Schedules a recovery email to be sent after a delay
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { CartAbandonmentEmail } from '@/emails/templates/CartAbandonmentEmail';
import type { CartAbandonmentEmailProps } from '@/emails/templates/CartAbandonmentEmail';
import { getBaseUrl } from '@/lib/url';
import { serverAnalytics } from '@/lib/analytics/server';
import type { CartItem as BaseCartItem } from '@/types/cart';

const resend = new Resend(process.env.RESEND_API_KEY);

/** Delay before sending abandonment email (in minutes) */
const ABANDONMENT_EMAIL_DELAY_MINUTES = 5;

/** Cart item for email display (subset of full CartItem) */
type EmailCartItem = Pick<BaseCartItem, 'title' | 'quantity' | 'price' | 'currency'>;

interface CartAbandonedRequest {
  email: string;
  firstName?: string;
  /** Cart items for email display */
  cartItems: EmailCartItem[];
  cartTotal: number;
  currency: string;
  /** Encoded cart state for URL reconstruction */
  encodedCartState?: string;
}

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

  try {
    const {
      email,
      firstName,
      cartItems,
      cartTotal,
      currency,
      encodedCartState,
    } = req.body as CartAbandonedRequest;

    // Validate required fields
    if (!email || !cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Email and cart items are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('[Cart Abandonment] RESEND_API_KEY is not configured');
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
      });
    }

    // Calculate scheduled time (5 minutes from now)
    const scheduledAt = new Date(
      Date.now() + ABANDONMENT_EMAIL_DELAY_MINUTES * 60 * 1000
    );

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

    // Render the email template
    const emailHtml = await render(
      React.createElement(CartAbandonmentEmail, emailProps)
    );

    // Schedule the email
    const result = await resend.emails.send({
      from: 'ZurichJS Conference <hello@zurichjs.com>',
      to: email,
      subject: 'Did you forget something? Your tickets are waiting!',
      html: emailHtml,
      scheduledAt: scheduledAt.toISOString(),
    });

    if (result.error) {
      console.error('[Cart Abandonment] Failed to schedule email:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error.message || 'Failed to schedule email',
      });
    }

    // Track email scheduled event in PostHog
    await serverAnalytics.track('cart_abandonment_email_scheduled', email, {
      email_id: result.data?.id,
      scheduled_for: scheduledAt.toISOString(),
      cart_recovery_url: cartRecoveryUrl,
      cart_item_count: cartItems.length,
      cart_total_amount: cartTotal,
      cart_currency: currency,
      cart_items: cartItems.map((item) => ({
        type: item.title.includes('Workshop') ? 'workshop_voucher' as const : 'ticket' as const,
        quantity: item.quantity,
        price: item.price,
      })),
      email,
      first_name: firstName,
    });

    // Flush analytics to ensure event is sent before response
    await serverAnalytics.flush();

    console.log('[Cart Abandonment] Email scheduled successfully:', {
      emailId: result.data?.id,
      to: email,
      scheduledFor: scheduledAt.toISOString(),
      cartRecoveryUrl,
    });

    return res.status(200).json({
      success: true,
      message: 'Abandonment email scheduled',
      emailId: result.data?.id,
      scheduledFor: scheduledAt.toISOString(),
    });
  } catch (error) {
    console.error('[Cart Abandonment] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to schedule abandonment email';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
