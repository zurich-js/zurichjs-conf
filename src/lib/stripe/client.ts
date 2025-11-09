/**
 * Stripe Client
 * Initialize and configure the Stripe client for server-side operations
 */

import Stripe from 'stripe';
import { env } from '@/config/env';

/**
 * Singleton Stripe client instance
 */
let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe client instance
 */
export function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  stripeInstance = new Stripe(env.stripe.secretKey, {
    apiVersion: '2025-10-29.clover',
    typescript: true,
  });

  return stripeInstance;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripeClient();

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.stripe.webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}
