/**
 * Client-side Stripe instance (singleton).
 * Uses the publishable key from environment config.
 */

import { loadStripe } from '@stripe/stripe-js';
import { clientEnv } from '@/config/env';

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripePromise() {
  if (!stripePromise) {
    stripePromise = loadStripe(clientEnv.stripe.publishableKey);
  }
  return stripePromise;
}
