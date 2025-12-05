/**
 * B2B Invoice Payment Business Logic
 * Handles payment confirmation and bulk ticket creation
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  B2BInvoice,
  B2BInvoiceAttendee,
  MarkPaidRequest,
  MarkPaidResult,
} from '@/lib/types/b2b';
import { getInvoiceWithAttendees } from './invoices';
import { validateAttendeeCount } from './attendees';
import { createTicket } from '@/lib/tickets/createTicket';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { generateTicketPDF, imageUrlToDataUrl } from '@/lib/pdf';

/** Format ticket stage from snake_case to human-readable */
const stageLabels: Record<string, string> = {
  blind_bird: 'Blind Bird',
  early_bird: 'Early Bird',
  general_admission: 'General Admission',
  late_bird: 'Late Bird',
};

/** Format ticket category from snake_case to human-readable */
const categoryLabels: Record<string, string> = {
  standard: 'Standard',
  student: 'Student',
  unemployed: 'Job Seeker',
  vip: 'VIP',
};

/**
 * Format ticket type for display (e.g., "Standard Blind Bird")
 * Format: Category + Stage (e.g., "VIP Early Bird", "Student General Admission")
 */
function formatTicketTypeLabel(stage: string | null, category: string | null): string {
  const stageLabel = stage ? stageLabels[stage] || stage : '';
  const categoryLabel = category ? categoryLabels[category] || category : '';

  if (stageLabel && categoryLabel) {
    return `${categoryLabel} ${stageLabel}`;
  }
  return stageLabel || categoryLabel || 'Conference';
}

/**
 * Mark an invoice as paid and create tickets for all attendees
 *
 * This is the main entry point for payment confirmation.
 * It performs these steps in order:
 * 1. Validate invoice status is 'sent' or 'draft'
 * 2. Validate all attendees are present (count matches ticket_quantity)
 * 3. Create tickets for each attendee
 * 4. Update invoice status to 'paid'
 * 5. Optionally send confirmation emails
 *
 * @param invoiceId - UUID of the invoice
 * @param request - Payment confirmation details
 * @returns Summary of created tickets and emails sent
 * @throws Error if validation fails or ticket creation fails
 */
export async function markInvoiceAsPaidAndCreateTickets(
  invoiceId: string,
  request: MarkPaidRequest
): Promise<MarkPaidResult> {
  const supabase = createServiceRoleClient();

  // Step 1: Verify confirmation flag
  if (!request.confirmTicketCreation) {
    throw new Error('Ticket creation must be explicitly confirmed');
  }

  // Step 2: Get invoice with attendees
  const invoiceWithAttendees = await getInvoiceWithAttendees(invoiceId);
  if (!invoiceWithAttendees) {
    throw new Error('Invoice not found');
  }

  const invoice = invoiceWithAttendees;
  const attendees = invoiceWithAttendees.attendees;

  // Step 3: Validate invoice status
  if (invoice.status !== 'draft' && invoice.status !== 'sent') {
    throw new Error(
      `Cannot mark invoice as paid. Current status: ${invoice.status}. ` +
        `Only 'draft' or 'sent' invoices can be marked as paid.`
    );
  }

  // Step 4: Validate attendee count
  const validation = await validateAttendeeCount(invoiceId);
  if (!validation.isValid) {
    throw new Error(
      `Cannot mark invoice as paid: ${validation.message}. ` +
        `Please add all attendee details before confirming payment.`
    );
  }

  // Step 5: Create tickets for each attendee
  const ticketResults: MarkPaidResult['tickets'] = [];
  const failedAttendees: string[] = [];

  for (const attendee of attendees) {
    try {
      const ticketResult = await createTicketForAttendee(invoice, attendee, request.bankTransferReference);

      if (ticketResult.success && ticketResult.ticketId) {
        ticketResults.push({
          attendeeId: attendee.id,
          attendeeName: `${attendee.first_name} ${attendee.last_name}`,
          attendeeEmail: attendee.email,
          ticketId: ticketResult.ticketId,
        });

        // Update attendee with ticket link
        await supabase
          .from('b2b_invoice_attendees')
          .update({ ticket_id: ticketResult.ticketId })
          .eq('id', attendee.id);
      } else {
        failedAttendees.push(`${attendee.first_name} ${attendee.last_name} (${attendee.email}): ${ticketResult.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      failedAttendees.push(`${attendee.first_name} ${attendee.last_name} (${attendee.email}): ${errorMsg}`);
    }
  }

  // If any tickets failed, throw error with details
  if (failedAttendees.length > 0) {
    throw new Error(
      `Failed to create tickets for ${failedAttendees.length} attendee(s):\n` +
        failedAttendees.join('\n') +
        `\n\n${ticketResults.length} tickets were created successfully.`
    );
  }

  // Step 6: Update invoice status to paid
  const { error: updateError } = await supabase
    .from('b2b_invoices')
    .update({
      status: 'paid',
      bank_transfer_reference: request.bankTransferReference,
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('Error updating invoice status:', updateError);
    throw new Error(
      `Tickets were created but failed to update invoice status: ${updateError.message}`
    );
  }

  // Step 7: Send confirmation emails if requested
  let emailsSent = 0;
  let emailsFailed = 0;
  let emailFailures: MarkPaidResult['emailFailures'] = undefined;

  if (request.sendConfirmationEmails) {
    const emailResult = await sendConfirmationEmails(invoiceId, ticketResults);
    emailsSent = emailResult.emailsSent;
    emailsFailed = emailResult.emailsFailed;
    if (emailResult.failures.length > 0) {
      emailFailures = emailResult.failures;
    }
  }

  return {
    success: true,
    invoiceId,
    invoiceNumber: invoice.invoice_number,
    ticketsCreated: ticketResults.length,
    emailsSent,
    emailsFailed,
    tickets: ticketResults,
    emailFailures,
  };
}

/**
 * Create a single ticket for an attendee
 *
 * @param invoice - The B2B invoice
 * @param attendee - The attendee to create ticket for
 * @param bankTransferReference - Bank reference for metadata
 */
async function createTicketForAttendee(
  invoice: B2BInvoice,
  attendee: B2BInvoiceAttendee,
  bankTransferReference: string
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  // ticketType is a legacy field that combines stage and category
  // Use the stage as the ticketType for B2B invoices
  const result = await createTicket({
    ticketType: invoice.ticket_stage as 'blind_bird' | 'early_bird' | 'standard' | 'student' | 'unemployed' | 'late_bird' | 'vip',
    ticketCategory: invoice.ticket_category as 'standard' | 'student' | 'unemployed' | 'vip',
    ticketStage: invoice.ticket_stage as 'blind_bird' | 'early_bird' | 'general_admission' | 'late_bird',
    firstName: attendee.first_name,
    lastName: attendee.last_name,
    email: attendee.email,
    company: attendee.company || invoice.company_name,
    jobTitle: attendee.job_title,

    // B2B-specific identifiers (not actual Stripe IDs)
    stripeCustomerId: `b2b_${invoice.invoice_number}`,
    stripeSessionId: `b2b_${invoice.id}_${attendee.id}`,

    amountPaid: invoice.unit_price,
    currency: invoice.currency,
    status: 'confirmed',

    metadata: {
      isB2B: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      companyName: invoice.company_name,
      paymentType: 'bank_transfer',
      bankTransferReference,
    },
  });

  return {
    success: result.success,
    ticketId: result.ticket?.id,
    error: result.error,
  };
}

/** Result of sending confirmation emails */
interface EmailSendResult {
  emailsSent: number;
  emailsFailed: number;
  failures: Array<{
    attendeeEmail: string;
    attendeeName: string;
    reason: string;
  }>;
}

/**
 * Send confirmation emails to all attendees with PDF attachments
 *
 * @param invoiceId - UUID of the invoice
 * @param tickets - Array of created tickets with attendee info
 * @returns Email send results with success/failure counts and failure reasons
 */
async function sendConfirmationEmails(
  invoiceId: string,
  tickets: MarkPaidResult['tickets']
): Promise<EmailSendResult> {
  const supabase = createServiceRoleClient();
  let emailsSent = 0;
  let emailsFailed = 0;
  const failures: EmailSendResult['failures'] = [];

  for (const ticketInfo of tickets) {
    try {
      // Fetch the full ticket record to get QR code URL
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketInfo.ticketId)
        .single();

      if (error || !ticket) {
        const reason = error?.message || 'Ticket record not found in database';
        console.error(`Failed to fetch ticket ${ticketInfo.ticketId}:`, reason);
        failures.push({
          attendeeEmail: ticketInfo.attendeeEmail,
          attendeeName: ticketInfo.attendeeName,
          reason: `Failed to fetch ticket: ${reason}`,
        });
        emailsFailed++;
        continue;
      }

      // Check for QR code URL
      if (!ticket.qr_code_url) {
        const reason = 'Ticket does not have a QR code URL';
        console.error(`Missing QR code for ticket ${ticketInfo.ticketId}`);
        failures.push({
          attendeeEmail: ticketInfo.attendeeEmail,
          attendeeName: ticketInfo.attendeeName,
          reason,
        });
        emailsFailed++;
        continue;
      }

      // Format ticket type for human-readable display
      const ticketTypeLabel = formatTicketTypeLabel(ticket.ticket_stage, ticket.ticket_category);

      // Generate ticket PDF with QR code
      let pdfBuffer: Buffer | undefined;
      try {
        // Convert QR code URL to data URL for PDF embedding
        const qrCodeDataUrl = await imageUrlToDataUrl(ticket.qr_code_url);

        pdfBuffer = await generateTicketPDF({
          ticketId: ticket.id,
          attendeeName: `${ticket.first_name} ${ticket.last_name}`,
          attendeeEmail: ticket.email,
          ticketType: ticketTypeLabel,
          orderNumber: ticket.id,
          amountPaid: ticket.amount_paid,
          currency: ticket.currency,
          conferenceDate: 'September 11, 2026',
          conferenceName: 'ZurichJS Conference 2026',
          venueName: 'Technopark Zürich',
          venueAddress: 'Technoparkstrasse 1, 8005 Zürich',
          qrCodeDataUrl,
        });
        console.log(`[B2B Email] Generated PDF for ticket ${ticket.id}, size: ${pdfBuffer.length} bytes`);
      } catch (pdfError) {
        console.error(`[B2B Email] Failed to generate PDF for ticket ${ticket.id}:`, pdfError);
        // Continue without PDF attachment - email can still be sent
      }

      // Send email using the existing email function
      const emailResult = await sendTicketConfirmationEmail({
        to: ticket.email,
        customerName: `${ticket.first_name} ${ticket.last_name}`,
        customerEmail: ticket.email,
        ticketType: ticketTypeLabel,
        orderNumber: ticket.id,
        amountPaid: ticket.amount_paid,
        currency: ticket.currency,
        conferenceDate: 'September 11, 2026',
        conferenceName: 'ZurichJS Conference 2026',
        ticketId: ticket.id,
        qrCodeUrl: ticket.qr_code_url,
        pdfAttachment: pdfBuffer,
      });

      if (!emailResult.success) {
        const reason = emailResult.error || 'Unknown email sending error';
        console.error(`Failed to send email to ${ticketInfo.attendeeEmail}:`, reason);
        failures.push({
          attendeeEmail: ticketInfo.attendeeEmail,
          attendeeName: ticketInfo.attendeeName,
          reason,
        });
        emailsFailed++;
        continue;
      }

      // Mark email as sent in attendee record
      await supabase
        .from('b2b_invoice_attendees')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', ticketInfo.attendeeId);

      emailsSent++;
      console.log(`[B2B Email] ✅ Email sent to ${ticketInfo.attendeeEmail} with PDF attachment`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error during email processing';
      console.error(`Failed to send email to ${ticketInfo.attendeeEmail}:`, error);
      failures.push({
        attendeeEmail: ticketInfo.attendeeEmail,
        attendeeName: ticketInfo.attendeeName,
        reason,
      });
      emailsFailed++;
      // Continue with other emails - don't fail the whole operation
    }
  }

  return { emailsSent, emailsFailed, failures };
}

/**
 * Get payment summary for an invoice
 * Useful for displaying payment status in UI
 *
 * @param invoiceId - UUID of the invoice
 */
export async function getPaymentSummary(invoiceId: string): Promise<{
  invoice: B2BInvoice;
  attendeeCount: number;
  ticketsCreated: number;
  emailsSent: number;
  canMarkAsPaid: boolean;
  canMarkAsPaidReason?: string;
}> {
  const invoiceWithAttendees = await getInvoiceWithAttendees(invoiceId);
  if (!invoiceWithAttendees) {
    throw new Error('Invoice not found');
  }

  const attendees = invoiceWithAttendees.attendees;
  const ticketsCreated = attendees.filter((a) => a.ticket_id !== null).length;
  const emailsSent = attendees.filter((a) => a.email_sent).length;

  // Check if invoice can be marked as paid
  let canMarkAsPaid = true;
  let canMarkAsPaidReason: string | undefined;

  if (invoiceWithAttendees.status === 'paid') {
    canMarkAsPaid = false;
    canMarkAsPaidReason = 'Invoice is already paid';
  } else if (invoiceWithAttendees.status === 'cancelled') {
    canMarkAsPaid = false;
    canMarkAsPaidReason = 'Invoice is cancelled';
  } else if (attendees.length !== invoiceWithAttendees.ticket_quantity) {
    canMarkAsPaid = false;
    canMarkAsPaidReason = `Missing attendees: ${attendees.length} of ${invoiceWithAttendees.ticket_quantity} provided`;
  }

  return {
    invoice: invoiceWithAttendees,
    attendeeCount: attendees.length,
    ticketsCreated,
    emailsSent,
    canMarkAsPaid,
    canMarkAsPaidReason,
  };
}
