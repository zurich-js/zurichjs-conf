/**
 * Ticket PDF Download API
 * GET /api/admin/tickets/[id]/pdf
 *
 * Renders the same ticket PDF that is attached to the purchase confirmation
 * email and streams it back as a download.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { generateTicketPdfForTicket, ticketPdfFilename } from '@/lib/tickets';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Ticket PDF');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(
        'id, first_name, last_name, email, ticket_category, ticket_stage, amount_paid, currency, qr_code_url'
      )
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!ticket.qr_code_url) {
      return res.status(422).json({
        error: 'This ticket has no QR code yet, so a PDF cannot be generated',
      });
    }

    const pdfBuffer = await generateTicketPdfForTicket(ticket);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${ticketPdfFilename(ticket.id)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store');

    return res.send(pdfBuffer);
  } catch (err) {
    log.error('Failed to generate ticket PDF', err, { ticketId: id });
    return res.status(500).json({ error: 'Failed to generate ticket PDF' });
  }
}
