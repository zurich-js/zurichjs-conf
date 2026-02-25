/**
 * Reassign Ticket API
 * POST /api/admin/tickets/[id]/reassign
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { generateOrderUrl } from '@/lib/auth/orderToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { email, firstName, lastName } = req.body;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, first name, and last name are required' });
    }

    const supabase = createServiceRoleClient();

    // First, get the current ticket to save original owner info
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentTicket) {
      console.error('Error fetching ticket:', fetchError);
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Update ticket with new owner details and save transfer info
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        email,
        first_name: firstName,
        last_name: lastName,
        transferred_from_name: `${currentTicket.first_name} ${currentTicket.last_name}`,
        transferred_from_email: currentTicket.email,
        transferred_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !ticket) {
      console.error('Error updating ticket:', updateError);
      return res.status(500).json({ error: 'Failed to reassign ticket' });
    }

    // Send email to new owner with transfer information
    const customerName = `${firstName} ${lastName}`;
    const transferFromName = `${currentTicket.first_name} ${currentTicket.last_name}`;
    const transferNotes = `This ticket has been transferred to you by ${transferFromName} (${currentTicket.email}).`;
    const orderUrl = generateOrderUrl(ticket.id);

    const emailResult = await sendTicketConfirmationEmail({
      to: email,
      customerName,
      customerEmail: email,
      ticketType: ticket.ticket_type,
      orderNumber: ticket.id,
      amountPaid: ticket.amount_paid,
      currency: ticket.currency,
      conferenceDate: 'September 11, 2026',
      conferenceName: 'ZurichJS Conference 2026',
      ticketId: ticket.id,
      qrCodeUrl: ticket.qr_code_url || undefined,
      orderUrl,
      notes: transferNotes,
    });

    if (!emailResult.success) {
      console.error('Failed to send email to new owner:', emailResult.error);
      // Don't fail the request, ticket was reassigned successfully
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket reassigned successfully',
      ticket,
    });
  } catch (error) {
    console.error('Reassign ticket error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
