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
import { logger } from '@/lib/logger';

const log = logger.scope('Stripe Webhook');

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
  log.info('Received webhook request', {
    method: req.method,
    hasSignature: !!req.headers['stripe-signature'],
  });

  // Only allow POST requests
  if (req.method !== 'POST') {
    log.warn('Method not allowed', { method: req.method });
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get raw body and signature
    const buf = await buffer(req);
    log.info('Request body received', { bodySize: buf.length });

    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      log.error('Missing or invalid stripe-signature header');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(buf, signature);

    if (!event) {
      log.error('Invalid webhook signature');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    log.info('Signature verified', { eventType: event.type, eventId: event.id });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        log.info('Handling checkout.session.completed', {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          amountTotal: session.amount_total,
        });
        await handleCheckoutSessionCompleted(session);
        log.info('checkout.session.completed handled successfully', { sessionId: session.id });
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        log.info('Handling async_payment_succeeded', { sessionId: session.id });
        await handleAsyncPaymentSucceeded(session);
        log.info('async_payment_succeeded handled successfully', { sessionId: session.id });
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        log.info('Handling async_payment_failed', { sessionId: session.id });
        await handleAsyncPaymentFailed(session);
        log.info('async_payment_failed handled successfully', { sessionId: session.id });
        break;
      }

      default:
        log.warn('Unhandled event type', { eventType: event.type });
    }

    // Return a response to acknowledge receipt of the event
    log.info('Sending success response to Stripe');
    res.status(200).json({ received: true });
  } catch (error) {
    log.error('Error processing webhook', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Return 500 so Stripe retries
    log.warn('Sending error response to Stripe (will retry)');
    res.status(500).json({ error: errorMessage });
  }
}
