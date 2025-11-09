/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events for ticket purchases and workshop registrations
 *
 * This webhook:
 * - Verifies Stripe signatures
 * - Creates user profiles in Supabase
 * - Links Stripe customers to users
 * - Creates ticket and workshop registration records
 * - Is idempotent (safe to retry)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type Stripe from 'stripe';
import { buffer } from 'micro';
import { verifyWebhookSignature } from '@/lib/stripe/client';
import {
  handleCheckoutSessionCompleted,
  handleAsyncPaymentSucceeded,
  handleAsyncPaymentFailed,
} from '@/lib/stripe/webhookHandlers';

/**
 * Disable body parsing - we need the raw body for webhook signature verification
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * API Handler for Stripe webhooks
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  console.log('[Webhook] ====== Received webhook request ======');
  console.log('[Webhook] Method:', req.method);
  console.log('[Webhook] Headers:', {
    'content-type': req.headers['content-type'],
    'stripe-signature': req.headers['stripe-signature'] ? '(present)' : '(missing)',
  });

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('[Webhook] ❌ Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get raw body and signature
    console.log('[Webhook] Reading request body...');
    const buf = await buffer(req);
    console.log('[Webhook] Body size:', buf.length, 'bytes');

    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      console.error('[Webhook] ❌ Missing or invalid stripe-signature header');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Verify webhook signature
    console.log('[Webhook] Verifying webhook signature...');
    const event = verifyWebhookSignature(buf, signature);

    if (!event) {
      console.error('[Webhook] ❌ Invalid webhook signature');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    console.log('[Webhook] ✅ Signature verified');
    console.log('[Webhook] Event type:', event.type);
    console.log('[Webhook] Event ID:', event.id);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('[Webhook] Handling checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[Webhook] Session details:', {
          id: session.id,
          payment_status: session.payment_status,
          customer: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          amount_total: session.amount_total,
        });
        await handleCheckoutSessionCompleted(session);
        console.log('[Webhook] ✅ checkout.session.completed handled successfully');
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        console.log('[Webhook] Handling checkout.session.async_payment_succeeded event');
        const session = event.data.object as Stripe.Checkout.Session;
        await handleAsyncPaymentSucceeded(session);
        console.log('[Webhook] ✅ async_payment_succeeded handled successfully');
        break;
      }

      case 'checkout.session.async_payment_failed': {
        console.log('[Webhook] Handling checkout.session.async_payment_failed event');
        const session = event.data.object as Stripe.Checkout.Session;
        await handleAsyncPaymentFailed(session);
        console.log('[Webhook] ✅ async_payment_failed handled successfully');
        break;
      }

      default:
        console.log('[Webhook] ⚠️ Unhandled event type:', event.type);
    }

    // Return a response to acknowledge receipt of the event
    console.log('[Webhook] ✅ Sending success response to Stripe');
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] ❌ Error processing webhook:', error);
    console.error('[Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Return 500 so Stripe retries
    console.log('[Webhook] Sending error response to Stripe (will retry)');
    res.status(500).json({ error: errorMessage });
  }
}
