/**
 * Cancel Ticket API
 * POST /api/admin/tickets/[id]/cancel
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';

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

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const supabase = createServiceRoleClient();

    // Get ticket details
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'cancelled') {
      return res.status(400).json({ error: 'Ticket already cancelled' });
    }

    // Update ticket status to cancelled
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateError) {
      console.error('Error cancelling ticket:', updateError);
      return res.status(500).json({ error: 'Failed to cancel ticket' });
    }

    // TODO: Send cancellation confirmation email
    // You can add email sending here if needed

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel ticket error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
