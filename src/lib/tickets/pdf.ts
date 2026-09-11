/**
 * Ticket PDF Helpers
 *
 * Builds the ticket PDF that attendees receive as an email attachment on
 * purchase. Kept here so the admin download endpoint produces a byte-identical
 * document to the one the purchase flow mails out.
 */

import { generateTicketPDF, imageUrlToDataUrl, type TicketPDFProps } from '@/lib/pdf';
import { getTicketDisplayName } from '@/lib/stripe/ticket-utils';

/** Conference details printed on every ticket PDF. */
export const TICKET_PDF_EVENT = {
  conferenceName: 'ZurichJS Conference 2026',
  conferenceDate: 'September 11, 2026',
  venueName: 'Technopark Zürich',
  venueAddress: 'Technoparkstrasse 1, 8005 Zürich',
} as const;

/** The subset of a `tickets` row needed to render the ticket PDF. */
export interface TicketPdfSource {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_category: string;
  ticket_stage: string;
  amount_paid: number;
  currency: string;
  qr_code_url?: string | null;
}

/**
 * Build the PDF props for a stored ticket row.
 *
 * `qrCodeDataUrl` has to be resolved by the caller because the QR code lives in
 * object storage and `@react-pdf/renderer` only embeds inline data URLs.
 */
export function buildTicketPdfProps(
  ticket: TicketPdfSource,
  qrCodeDataUrl: string,
  notes?: string
): TicketPDFProps {
  return {
    ticketId: ticket.id,
    attendeeName: `${ticket.first_name} ${ticket.last_name}`.trim(),
    attendeeEmail: ticket.email,
    ticketType: getTicketDisplayName(ticket.ticket_category, ticket.ticket_stage),
    orderNumber: ticket.id,
    amountPaid: ticket.amount_paid,
    currency: ticket.currency || 'CHF',
    ...TICKET_PDF_EVENT,
    qrCodeDataUrl,
    notes,
  };
}

/**
 * Render the ticket PDF for a stored ticket row.
 *
 * @throws if the ticket has no QR code yet — without it the PDF cannot be
 * scanned at the door, so an incomplete document is never produced.
 */
export async function generateTicketPdfForTicket(
  ticket: TicketPdfSource,
  notes?: string
): Promise<Buffer> {
  if (!ticket.qr_code_url) {
    throw new Error('Ticket has no QR code, cannot generate PDF');
  }

  const qrCodeDataUrl = await imageUrlToDataUrl(ticket.qr_code_url);
  return generateTicketPDF(buildTicketPdfProps(ticket, qrCodeDataUrl, notes));
}

/** Filename used for the downloaded/attached ticket PDF. */
export function ticketPdfFilename(ticketId: string): string {
  return `${TICKET_PDF_EVENT.conferenceName.replace(/\s+/g, '_')}_Ticket_${ticketId}.pdf`;
}
