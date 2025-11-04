/**
 * Retrieve Stripe Checkout Session
 * Fetches details about a completed checkout session for the success page
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

/**
 * Response structure for session details
 */
interface SessionDetailsResponse {
  customer_email?: string;
  customer_name?: string;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  session_id?: string;
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
 * API Handler for retrieving Stripe Checkout Session details
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionDetailsResponse>
): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({
        error: 'Invalid session ID',
      });
      return;
    }

    const stripe = getStripeClient();

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'line_items.data.price.product'],
    });

    // Return session details
    res.status(200).json({
      customer_email: session.customer_details?.email || undefined,
      customer_name: session.customer_details?.name || undefined,
      amount_total: session.amount_total || undefined,
      currency: session.currency || undefined,
      payment_status: session.payment_status || undefined,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve checkout session';

    res.status(500).json({
      error: errorMessage,
    });
  }
}
