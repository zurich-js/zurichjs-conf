/**
 * Reassign Ticket API
 * POST /api/admin/tickets/[id]/reassign
 */

import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, HttpError, throwIfDbError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { getTicketDisplayName } from '@/lib/stripe/ticket-utils';
import { notifyTicketReassigned } from '@/lib/platform-notifications';
import { generateOrderUrl } from '@/lib/auth/orderToken';

const bodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export default withApiHandler(
  { scope: 'Reassign Ticket API', methods: ['POST'], bodySchema },
  async (req, res, { log, body }) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id } = req.query;
    if (typeof id !== 'string') {
      throw new HttpError(400, 'Invalid ticket ID');
    }

    const { email, firstName, lastName } = body;
    const supabase = createServiceRoleClient();

    // First, get the current ticket to save original owner info
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentTicket) {
      throw new HttpError(404, 'Ticket not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: fetchError,
        context: { ticketId: id },
      });
    }

    // Update ticket with new owner details and save transfer info
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        email,
        first_name: firstName,
        last_name: lastName,
        user_id: null,
        transferred_from_name: `${currentTicket.first_name} ${currentTicket.last_name}`,
        transferred_from_email: currentTicket.email,
        transferred_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    throwIfDbError(updateError, 'Failed to reassign ticket', {
      code: ErrorCodes.TICKET_REASSIGN_FAILED,
      context: { ticketId: id },
    });
    if (!ticket) {
      throw new HttpError(404, 'Ticket not found', {
        code: ErrorCodes.NOT_FOUND,
        context: { ticketId: id },
      });
    }

    // Send email to new owner with transfer information
    const customerName = `${firstName} ${lastName}`;
    const transferFromName = `${currentTicket.first_name} ${currentTicket.last_name}`;
    const transferNotes = `This ticket has been transferred to you by ${transferFromName} (${currentTicket.email}).`;
    const orderUrl = generateOrderUrl(ticket.id, ticket.manage_token_nonce);

    const emailResult = await sendTicketConfirmationEmail({
      to: email,
      customerName,
      customerEmail: email,
      ticketType: getTicketDisplayName(ticket.ticket_category, ticket.ticket_stage),
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
      // The reassignment itself succeeded — don't fail the request, but this
      // must be visible: the new owner has no ticket email until re-sent.
      log.error('Ticket reassigned but confirmation email failed', emailResult.error, {
        code: ErrorCodes.TICKET_EMAIL_FAILED,
        fingerprint: 'reassign-email-failed',
        ticketId: ticket.id,
        newOwnerEmail: email,
      });
    }

    notifyTicketReassigned({
      ticketId: ticket.id,
      ticketType: getTicketDisplayName(ticket.ticket_category, ticket.ticket_stage),
      fromName: transferFromName,
      fromEmail: currentTicket.email,
      toName: customerName,
      toEmail: email,
      reassignedBy: 'admin',
    });

    return res.status(200).json({
      success: true,
      message: emailResult.success
        ? 'Ticket reassigned successfully'
        : 'Ticket reassigned, but the confirmation email failed to send — resend it from the ticket page.',
      ticket,
    });
  }
);
