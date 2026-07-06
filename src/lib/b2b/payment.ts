/**
 * B2B Invoice Payment Business Logic
 * Handles payment confirmation and bulk ticket creation
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  B2BInvoice,
  B2BInvoiceAttendee,
  B2BInvoiceAttendeeWithWorkshops,
  B2BInvoiceWorkshopItem,
  MarkPaidRequest,
  MarkPaidResult,
} from '@/lib/types/b2b';
import { getInvoiceWithAttendees } from './invoices';
import { validateAttendeeCount, validateWorkshopAssignments } from './attendees';
import { createTicket } from '@/lib/tickets/createTicket';
import { createWorkshopRegistration } from '@/lib/workshops/createRegistration';
import {
  sendB2BWorkshopConfirmationEmails,
  type B2BWorkshopEmailTarget,
} from './workshop-emails';
import { toLegacyType } from '@/lib/stripe/ticket-utils';
import type { TicketCategory, TicketStage } from '@/lib/types/database';
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

  // Step 4b: Validate workshop seat assignments + remaining capacity before
  // creating anything, so a full workshop fails fast instead of halfway.
  if (invoice.workshop_items.length > 0) {
    const workshopValidation = await validateWorkshopAssignments(invoiceId);
    if (!workshopValidation.isValid) {
      throw new Error(
        `Cannot mark invoice as paid: workshop seats not fully assigned — ${workshopValidation.message}. ` +
          `Please assign every purchased workshop seat to an attendee before confirming payment.`
      );
    }

    await assertWorkshopCapacity(invoice.workshop_items);
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

  // Step 5b: Create workshop registrations for assigned seats
  const workshopRegistrations = await createWorkshopRegistrations(
    invoice,
    attendees,
    invoice.workshop_items,
    new Map(ticketResults.map((t) => [t.attendeeId, t.ticketId])),
    request.bankTransferReference
  );

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

  // Step 7: Send confirmation emails if requested (ticket + workshop seat)
  let emailsSent = 0;
  let emailsFailed = 0;
  let emailFailures: MarkPaidResult['emailFailures'] = undefined;

  if (request.sendConfirmationEmails) {
    const emailResult = await sendConfirmationEmails(invoiceId, ticketResults);
    const workshopEmailResult = await sendB2BWorkshopConfirmationEmails(workshopRegistrations);

    emailsSent = emailResult.emailsSent + workshopEmailResult.emailsSent;
    emailsFailed = emailResult.emailsFailed + workshopEmailResult.emailsFailed;

    const allFailures = [...emailResult.failures, ...workshopEmailResult.failures];
    if (allFailures.length > 0) {
      emailFailures = allFailures;
    }
  }

  return {
    success: true,
    invoiceId,
    invoiceNumber: invoice.invoice_number,
    ticketsCreated: ticketResults.length,
    workshopRegistrationsCreated: workshopRegistrations.length,
    emailsSent,
    emailsFailed,
    tickets: ticketResults,
    emailFailures,
  };
}

/**
 * Verify every workshop line still has enough free capacity for its seats.
 * The atomic registration insert enforces this too, but checking up front
 * fails the whole operation before any tickets are created.
 */
async function assertWorkshopCapacity(items: B2BInvoiceWorkshopItem[]): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: workshops, error } = await supabase
    .from('workshops')
    .select('id, title, capacity, enrolled_count')
    .in(
      'id',
      items.map((item) => item.workshop_id)
    );

  if (error) {
    throw new Error(`Failed to check workshop capacity: ${error.message}`);
  }

  const workshopById = new Map((workshops || []).map((w) => [w.id, w]));
  const insufficient: string[] = [];

  for (const item of items) {
    const workshop = workshopById.get(item.workshop_id);
    if (!workshop) {
      insufficient.push(`"${item.workshop_title}": workshop no longer exists`);
      continue;
    }
    const remaining = Math.max(0, (workshop.capacity ?? 0) - (workshop.enrolled_count ?? 0));
    if (remaining < item.quantity) {
      insufficient.push(
        `"${item.workshop_title}": ${item.quantity} seat(s) needed but only ${remaining} remaining`
      );
    }
  }

  if (insufficient.length > 0) {
    throw new Error(`Cannot mark invoice as paid: ${insufficient.join('; ')}`);
  }
}

/**
 * Create workshop registrations for every assigned seat on a paid invoice.
 * Registrations reuse the ticket's B2B session identifier, so the atomic
 * insert's idempotency check makes retries safe.
 *
 * @returns Created registrations (including pre-existing ones on retry),
 *          shaped for the workshop confirmation email sender
 */
async function createWorkshopRegistrations(
  invoice: B2BInvoice,
  attendees: B2BInvoiceAttendeeWithWorkshops[],
  items: B2BInvoiceWorkshopItem[],
  ticketIdByAttendee: Map<string, string>,
  bankTransferReference: string
): Promise<B2BWorkshopEmailTarget[]> {
  if (items.length === 0) return [];

  const supabase = createServiceRoleClient();
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const failures: string[] = [];
  const created: B2BWorkshopEmailTarget[] = [];

  for (const attendee of attendees) {
    for (const itemId of attendee.workshop_item_ids) {
      const item = itemsById.get(itemId);
      if (!item) continue;

      const result = await createWorkshopRegistration({
        workshopId: item.workshop_id,
        ticketId: ticketIdByAttendee.get(attendee.id),
        stripeSessionId: `b2b_${invoice.id}_${attendee.id}`,
        amountPaid: item.unit_price,
        currency: invoice.currency,
        status: 'confirmed',
        firstName: attendee.first_name,
        lastName: attendee.last_name,
        email: attendee.email,
        company: attendee.company || invoice.company_name,
        jobTitle: attendee.job_title,
        metadata: {
          isB2B: true,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          companyName: invoice.company_name,
          paymentType: 'bank_transfer',
          bankTransferReference,
        },
      });

      if (result.success && result.registration) {
        created.push({
          registrationId: result.registration.id,
          workshopId: item.workshop_id,
          attendeeName: `${attendee.first_name} ${attendee.last_name}`,
          attendeeEmail: attendee.email,
        });
        await supabase
          .from('b2b_invoice_attendee_workshops')
          .update({ registration_id: result.registration.id })
          .eq('attendee_id', attendee.id)
          .eq('workshop_item_id', item.id);
      } else {
        const reason = result.oversold
          ? 'workshop is at full capacity'
          : result.error || 'unknown error';
        failures.push(
          `${attendee.first_name} ${attendee.last_name} (${attendee.email}) → "${item.workshop_title}": ${reason}`
        );
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Failed to create ${failures.length} workshop registration(s):\n` +
        failures.join('\n') +
        `\n\nAll conference tickets and ${created.length} workshop registration(s) were created. ` +
        `The invoice was NOT marked as paid — fix the issue and retry (already-created items are deduplicated).`
    );
  }

  return created;
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
  const ticketCategory = invoice.ticket_category as TicketCategory;
  const ticketStage = invoice.ticket_stage as TicketStage;

  // ticket_type is a legacy enum column whose values differ from ticket_stage
  // (it has no `general_admission`). Derive it from category + stage so the
  // insert doesn't fail on stages like `general_admission`.
  const result = await createTicket({
    ticketType: toLegacyType(ticketCategory, ticketStage),
    ticketCategory,
    ticketStage,
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
  } else if (invoiceWithAttendees.workshop_items.length > 0) {
    const workshopValidation = await validateWorkshopAssignments(invoiceId);
    if (!workshopValidation.isValid) {
      canMarkAsPaid = false;
      canMarkAsPaidReason = `Workshop seats not fully assigned: ${workshopValidation.message}`;
    }
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
