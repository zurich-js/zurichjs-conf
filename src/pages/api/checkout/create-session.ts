/**
 * Create Stripe Checkout Session
 * Handles creating a new checkout session for ticket purchases
 */

import Stripe from 'stripe';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ConfigError, ErrorCodes, HttpError, PaymentError } from '@/lib/errors';
import { getStripeRedirectUrls } from '@/lib/url';
import { validateCheckoutPrices } from '@/lib/stripe/validate-checkout';

const bodySchema = z.object({
  priceId: z.string().min(1),
});

/**
 * Initialize Stripe with secret key
 */
const getStripeClient = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new ConfigError('STRIPE_SECRET_KEY is not configured in environment variables');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
  });
};

/**
 * API Handler for creating Stripe Checkout Sessions
 */
export default withApiHandler(
  { scope: 'Checkout Create Session', methods: ['POST'], bodySchema },
  async (req, res, { log, body }) => {
    const { priceId } = body;

    const stripe = getStripeClient();

    // Validate price corresponds to the current pricing stage
    const validation = await validateCheckoutPrices(stripe, [priceId]);
    if (!validation.valid) {
      log.warn('Checkout blocked: price stage mismatch', { priceId, currentStage: validation.currentStage });
      throw new HttpError(
        400,
        validation.error ?? 'Ticket pricing has changed. Please refresh the page and try again.'
      );
    }

    // Get Stripe redirect URLs using centralized utility
    const { successUrl, cancelUrl } = getStripeRedirectUrls(req);

    // Create Checkout Session
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['CH', 'DE', 'AT', 'FR', 'IT', 'LI'],
        },
        automatic_tax: {
          enabled: true,
        },
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: 'ZurichJS Conference 2026 Ticket',
            footer: 'Thank you for your purchase! We look forward to seeing you at the conference.',
          },
        },
      });
    } catch (error) {
      // The wrapper maps this to a 500 with the safe registry message —
      // raw Stripe error text never reaches the browser.
      throw new PaymentError('Stripe checkout session creation failed', {
        cause: error,
        code: ErrorCodes.CHECKOUT_SESSION_FAILED,
        context: { priceId },
      });
    }

    // Return both session ID and URL
    res.status(200).json({
      sessionId: session.id,
      url: session.url || undefined,
    });
  }
);
