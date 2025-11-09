/**
 * Resend Ticket Email API
 * POST /api/admin/tickets/[id]/resend
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendTicketConfirmationEmail } from '@/lib/email';

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

    // Send email
    const customerName = `${ticket.first_name} ${ticket.last_name}`;
    const emailResult = await sendTicketConfirmationEmail({
      to: ticket.email,
      customerName,
      customerEmail: ticket.email,
      ticketType: ticket.ticket_type,
      orderNumber: ticket.id,
      amountPaid: ticket.amount_paid,
      currency: ticket.currency,
      conferenceDate: 'September 11, 2026',
      conferenceName: 'ZurichJS Conference 2026',
      ticketId: ticket.id,
      qrCodeUrl: ticket.qr_code_url || undefined,
    });

    if (!emailResult.success) {
      return res.status(500).json({ error: emailResult.error || 'Failed to send email' });
    }

    return res.status(200).json({ success: true, message: 'Ticket email resent successfully' });
  } catch (error) {
    console.error('Resend ticket error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
