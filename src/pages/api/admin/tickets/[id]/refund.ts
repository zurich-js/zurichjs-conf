/**
 * Refund Ticket API
 * POST /api/admin/tickets/[id]/refund
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const token = req.cookies.admin_token;
    if (!verifyAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { reason } = req.body;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const supabase = createServiceRoleClient();
    const stripe = getStripeClient();

    // Get ticket details
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'refunded') {
      return res.status(400).json({ error: 'Ticket already refunded' });
    }

    if (!ticket.stripe_payment_intent_id) {
      return res.status(400).json({ error: 'No payment intent found for this ticket' });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: ticket.stripe_payment_intent_id,
      reason: reason || 'requested_by_customer',
    });

    console.log('[Admin] Refund created:', refund.id);

    // Update ticket status
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'refunded' })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating ticket status:', updateError);
      // Refund was created in Stripe, but DB update failed
      return res.status(500).json({
        error: 'Refund created but failed to update ticket status',
        refundId: refund.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket refunded successfully',
      refundId: refund.id,
    });
  } catch (error) {
    console.error('Refund ticket error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
