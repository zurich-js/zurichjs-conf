/**
 * Refund Workshop Registration API
 * POST /api/admin/workshops/[id]/registrants/[registrationId]/refund
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, registrationId } = req.query;
    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    const supabase = createServiceRoleClient();
    const stripe = getStripeClient();

    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (error || !registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.status === 'refunded') {
      return res.status(400).json({ error: 'Registration already refunded' });
    }

    if (!registration.stripe_payment_intent_id) {
      return res.status(400).json({ error: 'No payment intent found for this registration' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: registration.stripe_payment_intent_id,
      amount: registration.amount_paid,
      reason: 'requested_by_customer',
      metadata: {
        workshop_id: id,
        registration_id: registrationId,
        admin_refund: 'true',
      },
    });

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update({ status: 'refunded' })
      .eq('id', registrationId);

    if (updateError) {
      return res.status(500).json({
        error: 'Refund created but failed to update registration status',
        refundId: refund.id,
      });
    }

    // Decrement enrolled_count
    const { data: ws } = await supabase.from('workshops').select('enrolled_count').eq('id', id).single();
    if (ws) {
      await supabase.from('workshops').update({ enrolled_count: Math.max(0, (ws.enrolled_count ?? 1) - 1) }).eq('id', id);
    }

    return res.status(200).json({
      success: true,
      message: 'Registration refunded successfully',
      refundId: refund.id,
    });
  } catch (error) {
    console.error('Refund registration error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
