/**
 * Retrieve Stripe Checkout Session
 * Fetches details about a completed checkout session for the success page
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { isWorkshopPrice, isTicketProduct } from '@/lib/stripe/ticket-utils';

const log = logger.scope('Checkout Session');

/**
 * Summarised line item returned to the client.
 */
interface LineItemSummary {
  description: string;
  quantity: number;
  amount: number;
  type: 'ticket' | 'workshop' | 'other';
}

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
  /** What the customer purchased – 'ticket', 'workshop', or 'mixed'. */
  purchase_type?: 'ticket' | 'workshop' | 'mixed';
  line_items?: LineItemSummary[];
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
        error: 'Invalid session ID provided',
      });
      return;
    }

    const stripe = getStripeClient();

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Validate session status — reject if not complete/paid
    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      log.warn('Session not in successful state', {
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
      });
      res.status(402).json({
        error: session.payment_status === 'unpaid'
          ? 'Payment was not completed. Please try again.'
          : session.status === 'expired'
            ? 'This checkout session has expired. Please start a new checkout.'
            : 'Payment failed or is still processing. Please check your payment method and try again.',
        payment_status: session.payment_status || undefined,
        session_id: session.id,
      });
      return;
    }

    // Only fetch line items for successfully paid sessions
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id, {
      expand: ['data.price.product'],
    });

    const items: LineItemSummary[] = lineItems.data.map((item) => {
      const price = item.price as Stripe.Price | undefined;
      let type: LineItemSummary['type'] = 'other';
      if (isWorkshopPrice(price)) type = 'workshop';
      else if (isTicketProduct(price)) type = 'ticket';
      return {
        description: item.description || '',
        quantity: item.quantity || 1,
        amount: item.amount_total || 0,
        type,
      };
    });

    const hasTickets = items.some((i) => i.type === 'ticket');
    const hasWorkshops = items.some((i) => i.type === 'workshop');
    const purchaseType = hasTickets && hasWorkshops ? 'mixed' : hasWorkshops ? 'workshop' : 'ticket';

    // Return session details only for confirmed payments
    res.status(200).json({
      customer_email: session.customer_details?.email || undefined,
      customer_name: session.customer_details?.name || undefined,
      amount_total: session.amount_total || undefined,
      currency: session.currency || undefined,
      payment_status: session.payment_status || undefined,
      session_id: session.id,
      purchase_type: purchaseType,
      line_items: items,
    });
  } catch (error) {
    log.error('Error retrieving checkout session', error);

    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      res.status(400).json({
        error: `Stripe error: ${error.message}`,
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve checkout session';

    res.status(500).json({
      error: errorMessage,
    });
  }
}
