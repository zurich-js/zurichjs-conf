/**
 * Ticket Email Processing
 * Handles sending confirmation emails for ticket purchases
 */

import type Stripe from 'stripe';
import {
  sendTicketConfirmationEmailsQueued,
  type TicketConfirmationData,
} from '@/lib/email';
import { generateTicketPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateOrderUrl } from '@/lib/auth/orderToken';
import { logger } from '@/lib/logger';
import type { TicketCreationResult } from './tickets';

/**
 * Prepare and send confirmation emails for all ticket purchases
 */
export async function sendTicketConfirmationEmails(
  ticketResults: TicketCreationResult[],
  ticketDisplayName: string,
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  const primaryAttendee = ticketResults[0]?.attendee;
  const primaryName = primaryAttendee ? `${primaryAttendee.firstName} ${primaryAttendee.lastName}` : 'Unknown';

  log.info('Preparing confirmation emails', { count: ticketResults.length });
  const emailsToSend: TicketConfirmationData[] = [];

  for (let i = 0; i < ticketResults.length; i++) {
    const result = ticketResults[i];
    if (!result.success || !result.ticket) continue;

    try {
      const ticketId = result.ticket.id;
      const attendeeName = `${result.attendee.firstName} ${result.attendee.lastName}`;
      const isPrimary = i === 0;

      if (!ticketId) {
        log.error('Ticket ID is missing for attendee', new Error('Missing ticket ID'), { email: result.attendee.email });
        continue;
      }

      log.debug('Preparing email', {
        email: result.attendee.email,
        isPrimary,
        hasOrderSummary: isPrimary && ticketResults.length > 1,
      });

      let notes: string | undefined;

      if (isPrimary && ticketResults.length > 1) {
        const otherAttendees = ticketResults.slice(1).map(r =>
          `${r.attendee.firstName} ${r.attendee.lastName} (${r.attendee.email})`
        ).join('\n');

        notes = `Order Summary:\n` +
          `Total Tickets: ${ticketResults.length}\n` +
          `Total Amount: ${((session.amount_total || 0) / 100).toFixed(2)} ${session.currency?.toUpperCase() || 'CHF'}\n\n` +
          `Additional Attendees:\n${otherAttendees}\n\n` +
          `Each attendee will receive their individual ticket via email.`;
      } else if (!isPrimary) {
        notes = `This ticket was purchased by ${primaryName} (${primaryAttendee?.email || 'unknown'}).\n\n` +
          `If you have any questions about this ticket, please contact them directly.`;
      }

      let pdfBuffer: Buffer | undefined;
      try {
        if (result.ticket.qr_code_url) {
          log.debug('Generating PDF for ticket', { ticketId });
          const qrCodeDataUrl = await imageUrlToDataUrl(result.ticket.qr_code_url);

          pdfBuffer = await generateTicketPDF({
            ticketId,
            attendeeName,
            attendeeEmail: result.attendee.email,
            ticketType: ticketDisplayName,
            orderNumber: ticketId,
            amountPaid: result.ticket.amount_paid,
            currency: session.currency?.toUpperCase() || 'CHF',
            conferenceDate: 'September 11, 2026',
            conferenceName: 'ZurichJS Conference 2026',
            venueName: 'Technopark Zürich',
            venueAddress: 'Technoparkstrasse 1, 8005 Zürich',
            qrCodeDataUrl,
            notes,
          });

          log.debug('PDF generated successfully', { ticketId });
        } else {
          log.warn('No QR code URL available, skipping PDF generation', { ticketId });
        }
      } catch (pdfError) {
        log.error('Error generating PDF', pdfError, {
          type: 'system',
          severity: 'medium',
          code: 'PDF_GENERATION_ERROR',
          ticketId,
        });
      }

      const orderUrl = generateOrderUrl(ticketId);

      emailsToSend.push({
        to: result.attendee.email,
        customerName: attendeeName,
        customerEmail: result.attendee.email,
        ticketType: ticketDisplayName,
        orderNumber: ticketId,
        amountPaid: result.ticket.amount_paid,
        currency: session.currency?.toUpperCase() || 'CHF',
        conferenceDate: 'September 11, 2026',
        conferenceName: 'ZurichJS Conference 2026',
        ticketId,
        qrCodeUrl: result.ticket.qr_code_url || undefined,
        orderUrl,
        notes,
        pdfAttachment: pdfBuffer,
      });
    } catch (error) {
      log.error('Error preparing email', error, {
        type: 'system',
        severity: 'medium',
        code: 'EMAIL_PREP_ERROR',
        email: result.attendee.email,
      });
    }
  }

  if (emailsToSend.length > 0) {
    const emailResults = await sendTicketConfirmationEmailsQueued(emailsToSend);

    const successfulEmails = emailResults.filter(r => r.success);
    const failedEmails = emailResults.filter(r => !r.success);

    log.info('Successfully sent ticket emails', { count: successfulEmails.length });
    if (failedEmails.length > 0) {
      log.error('Failed to send ticket emails', new Error(`${failedEmails.length} email(s) failed`), {
        type: 'system',
        severity: 'medium',
        code: 'TICKET_EMAIL_FAILED',
        failedCount: failedEmails.length,
        failedEmails: failedEmails.map(r => ({ email: r.email, error: r.error })),
      });
    }
  }
}
