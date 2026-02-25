/**
 * Admin Stripe Payment Lookup API
 * GET /api/admin/stripe-payment?id=pi_xxx - Lookup payment details from Stripe
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Stripe Payment');

interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  description: string | null;
  created: number;
  metadata: Record<string, string>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const stripe = getStripeClient();
    let paymentDetails: PaymentDetails | null = null;

    // Try to fetch as PaymentIntent first (pi_xxx)
    if (id.startsWith('pi_')) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(id, {
          expand: ['customer', 'latest_charge'],
        });

        const customer = paymentIntent.customer as { email?: string; name?: string } | null;
        const charge = paymentIntent.latest_charge as { billing_details?: { email?: string; name?: string } } | null;

        paymentDetails = {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          status: paymentIntent.status,
          customerEmail: charge?.billing_details?.email || customer?.email || null,
          customerName: charge?.billing_details?.name || customer?.name || null,
          description: paymentIntent.description,
          created: paymentIntent.created,
          metadata: paymentIntent.metadata || {},
        };
      } catch (error) {
        log.error('Error fetching payment intent', error);
        return res.status(404).json({ error: 'Payment not found' });
      }
    }
    // Try to fetch as Charge (ch_xxx)
    else if (id.startsWith('ch_')) {
      try {
        const charge = await stripe.charges.retrieve(id);

        paymentDetails = {
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency.toUpperCase(),
          status: charge.status,
          customerEmail: charge.billing_details?.email || null,
          customerName: charge.billing_details?.name || null,
          description: charge.description,
          created: charge.created,
          metadata: charge.metadata || {},
        };
      } catch (error) {
        log.error('Error fetching charge', error);
        return res.status(404).json({ error: 'Payment not found' });
      }
    }
    // Try to fetch as Checkout Session (cs_xxx)
    else if (id.startsWith('cs_')) {
      try {
        const session = await stripe.checkout.sessions.retrieve(id, {
          expand: ['customer', 'payment_intent'],
        });

        const paymentIntent = session.payment_intent as { id: string } | null;

        paymentDetails = {
          id: session.id,
          amount: session.amount_total || 0,
          currency: (session.currency || 'CHF').toUpperCase(),
          status: session.payment_status,
          customerEmail: session.customer_details?.email || null,
          customerName: session.customer_details?.name || null,
          description: null,
          created: session.created,
          metadata: {
            ...session.metadata,
            payment_intent_id: paymentIntent?.id || '',
          },
        };
      } catch (error) {
        log.error('Error fetching checkout session', error);
        return res.status(404).json({ error: 'Payment not found' });
      }
    } else {
      return res.status(400).json({
        error: 'Invalid payment ID format. Must start with pi_, ch_, or cs_'
      });
    }

    return res.status(200).json({ payment: paymentDetails });
  } catch (error) {
    log.error('Error looking up payment', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
