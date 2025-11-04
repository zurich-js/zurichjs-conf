/**
 * Create Stripe Checkout Session
 * Handles creating a new checkout session for ticket purchases
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

/**
 * Response structure for checkout session creation
 */
interface CheckoutSessionResponse {
  sessionId?: string;
  url?: string;
  error?: string;
}

/**
 * Initialize Stripe with secret key
 */
const getStripeClient = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
  });
};

/**
 * API Handler for creating Stripe Checkout Sessions
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckoutSessionResponse>
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const { priceId } = req.body;

    if (!priceId || typeof priceId !== 'string') {
      res.status(400).json({
        error: 'Invalid price ID',
      });
      return;
    }

    const stripe = getStripeClient();

    // Get the origin for success/cancel URLs
    const origin = req.headers.origin || `https://${req.headers.host}`;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}`,
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

    // Return both session ID and URL
    res.status(200).json({
      sessionId: session.id,
      url: session.url || undefined,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';

    res.status(500).json({
      error: errorMessage,
    });
  }
}
