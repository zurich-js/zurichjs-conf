/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events for ticket purchases
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { buffer } from 'micro';

/**
 * Disable body parsing, need raw body for webhook signature verification
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Initialize Stripe client
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
 * Get ticket type display name from price lookup key
 */
const getTicketTypeFromLookupKey = (lookupKey: string | null): string => {
  if (!lookupKey) return 'Conference Ticket';

  // Extract ticket type from lookup key pattern: category_stage
  // e.g., "super_saver_blind_bird" -> "Super Saver"
  const parts = lookupKey.split('_');

  if (parts[0] === 'super' && parts[1] === 'saver') {
    return 'Super Saver';
  } else if (parts[0] === 'vip') {
    return 'VIP';
  } else if (parts[0] === 'standard') {
    return 'Standard';
  }

  return 'Conference Ticket';
};

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe
): Promise<void> {
  console.log('Processing checkout.session.completed event:', session.id);

  // Extract customer information
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'Valued Customer';

  if (!customerEmail) {
    console.error('No customer email found in checkout session');
    return;
  }

  // Get line items to determine ticket type
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price'],
  });

  const firstItem = lineItems.data[0];
  const price = firstItem?.price as Stripe.Price | undefined;
  const lookupKey = price?.lookup_key || null;
  const ticketType = getTicketTypeFromLookupKey(lookupKey);

  // Get payment information
  const amountPaid = session.amount_total || 0;
  const currency = session.currency?.toUpperCase() || 'CHF';

  // Generate order number from session ID
  const orderNumber = `ZJS-${session.id.slice(-8).toUpperCase()}`;

  // Send confirmation email
  try {
    const emailResult = await sendTicketConfirmationEmail({
      to: customerEmail,
      customerName,
      customerEmail,
      ticketType,
      orderNumber,
      amountPaid,
      currency,
      conferenceDate: 'September 11, 2026',
      conferenceName: 'ZurichJS Conference 2026',
    });

    if (emailResult.success) {
      console.log(`Ticket confirmation email sent to ${customerEmail}`);
    } else {
      console.error(`Failed to send email to ${customerEmail}:`, emailResult.error);
    }
  } catch (error) {
    console.error('Error sending ticket confirmation email:', error);
  }
}

/**
 * API Handler for Stripe webhooks
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  try {
    // Get raw body for signature verification
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(buf, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      res.status(400).json({ error: `Webhook Error: ${error.message}` });
      return;
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, stripe);
        break;

      case 'checkout.session.async_payment_succeeded':
        // Handle async payment success (e.g., bank transfers)
        const asyncSession = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(asyncSession, stripe);
        break;

      case 'checkout.session.async_payment_failed':
        // Log failed async payments
        console.log('Async payment failed:', event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
}
