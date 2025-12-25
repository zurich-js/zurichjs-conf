/**
 * Ticket Operations API
 * DELETE /api/admin/tickets/[id] - Permanently delete a ticket
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Ticket Delete');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
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

    // Get ticket details first to confirm it exists
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('id, first_name, last_name, email')
      .eq('id', id)
      .single();

    if (fetchError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Permanently delete the ticket
    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      log.error('Error deleting ticket', deleteError);
      return res.status(500).json({ error: 'Failed to delete ticket' });
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket deleted successfully',
      deletedTicket: {
        id: ticket.id,
        name: `${ticket.first_name} ${ticket.last_name}`,
        email: ticket.email,
      },
    });
  } catch (error) {
    log.error('Error deleting ticket', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
