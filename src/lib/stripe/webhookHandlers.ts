/**
 * Stripe Webhook Event Handlers
 * Centralized handlers for different Stripe webhook events
 */

import type Stripe from 'stripe';
import { Resend } from 'resend';
import { getStripeClient } from './client';
import { createTicket } from '@/lib/tickets';
import type { TicketType, TicketCategory, TicketStage } from '@/lib/types/database';
import { TICKET_CATEGORIES, LOOKUP_KEY_STAGES, STAGE_LOOKUP_MAP } from '@/lib/types/ticket-constants';
import { sendTicketConfirmationEmailsQueued, sendVoucherConfirmationEmail, addNewsletterContact, type TicketConfirmationData } from '@/lib/email';
import { getCurrentStage } from '@/config/pricing-stages';
import { generateTicketPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateOrderUrl } from '@/lib/auth/orderToken';
import { serverAnalytics } from '@/lib/analytics/server';
import type { EventProperties } from '@/lib/analytics/events';
import { logger } from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Parse ticket info from lookup key: {category}_{stage}
 * Called after isTicketProduct() validation
 * Handles multi-part stage names like "blind_bird" correctly
 */
function parseTicketInfo(lookupKey: string): {
  category: TicketCategory;
  stage: TicketStage;
} {
  // Special cases
  if (lookupKey.includes('student')) {
    return { category: 'student', stage: 'general_admission' };
  }
  if (lookupKey.includes('unemployed')) {
    return { category: 'unemployed', stage: 'general_admission' };
  }

  // Parse category_stage pattern
  // Split only on first underscore to handle multi-part stage names like "blind_bird"
  const firstUnderscoreIndex = lookupKey.indexOf('_');
  if (firstUnderscoreIndex === -1) {
    // No underscore found, treat entire key as category
    return {
      category: lookupKey as TicketCategory,
      stage: 'general_admission',
    };
  }

  const category = lookupKey.substring(0, firstUnderscoreIndex);
  const stageKey = lookupKey.substring(firstUnderscoreIndex + 1);
  
  return {
    category: category as TicketCategory,
    stage: STAGE_LOOKUP_MAP[stageKey] || 'general_admission',
  };
}

/**
 * Get display name for ticket
 */
function getTicketDisplayName(category: TicketCategory, stage: TicketStage): string {
  if (category === 'vip') return 'VIP Ticket';
  if (category === 'student') return 'Student Ticket';
  if (category === 'unemployed') return 'Unemployed Ticket';

  const stageNames: Record<TicketStage, string> = {
    blind_bird: 'Blind Bird',
    early_bird: 'Early Bird',
    general_admission: 'Standard',
    late_bird: 'Late Bird',
  };

  return stageNames[stage] || 'Conference Ticket';
}

/**
 * Map category/stage to legacy ticket type (for database compatibility)
 */
function toLegacyType(category: TicketCategory, stage: TicketStage): TicketType {
  if (category === 'vip') return 'vip';
  if (category === 'student') return 'student';
  if (category === 'unemployed') return 'unemployed';
  if (stage === 'blind_bird') return 'blind_bird';
  if (stage === 'early_bird') return 'early_bird';
  if (stage === 'late_bird') return 'late_bird';
  return 'standard';
}

/**
 * Check if a price is a valid conference ticket product
 * Validates based on lookup key pattern: {category}_{stage}
 * Handles multi-part stage names like "blind_bird" correctly
 */
function isTicketProduct(price: Stripe.Price | undefined): boolean {
  if (!price?.lookup_key) return false;

  const lookupKey = price.lookup_key;

  // Special cases: student/unemployed tickets
  if (lookupKey === 'standard_student_unemployed' ||
      lookupKey.includes('student') ||
      lookupKey.includes('unemployed')) {
    return true;
  }

  // Standard pattern: category_stage
  // Split only on first underscore to handle multi-part stage names like "blind_bird"
  const firstUnderscoreIndex = lookupKey.indexOf('_');
  if (firstUnderscoreIndex === -1) {
    // No underscore found, check if entire key is a valid category
    return (TICKET_CATEGORIES as readonly string[]).includes(lookupKey);
  }

  const category = lookupKey.substring(0, firstUnderscoreIndex);
  const stageKey = lookupKey.substring(firstUnderscoreIndex + 1);
  
  return (TICKET_CATEGORIES as readonly string[]).includes(category) &&
         (LOOKUP_KEY_STAGES as readonly string[]).includes(stageKey);
}

/**
 * Check if a price is a workshop voucher
 * Vouchers are identified by matching WORKSHOP_VOUCHER_PRODUCT_ID
 */
function isWorkshopVoucher(price: Stripe.Price | undefined): boolean {
  if (!price) return false;

  const workshopVoucherProductId = process.env.WORKSHOP_VOUCHER_PRODUCT_ID;
  if (!workshopVoucherProductId) return false;

  const productId = typeof price.product === 'string' ? price.product : price.product?.id;
  return productId === workshopVoucherProductId;
}

/**
 * Handle successful checkout session
 * Creates ticket and user profile records
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const startTime = Date.now();
  const log = logger.scope('WebhookHandler', { sessionId: session.id });

  // Track webhook received
  await serverAnalytics.track('webhook_received', session.id, {
    webhook_source: 'stripe',
    webhook_event_type: 'checkout.session.completed',
    webhook_id: session.id,
    webhook_success: true,
    webhook_processing_time_ms: 0, // Will update at end
  } as EventProperties<'webhook_received'>);

  const stripe = getStripeClient();

  // Extract customer information
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'Valued Customer';

  if (!customerEmail) {
    log.error('No customer email in checkout session', new Error('Customer email is required'), {
      type: 'payment',
      severity: 'high',
      code: 'MISSING_EMAIL',
    });
    await serverAnalytics.error(session.id, 'No customer email in checkout session', {
      type: 'payment',
      severity: 'high',
      code: 'MISSING_EMAIL',
      stack: new Error('Customer email is required').stack,
    });
    throw new Error('Customer email is required');
  }

  // Cancel any scheduled cart abandonment emails for this customer
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase');
    const supabase = createServiceRoleClient();

    const { data: scheduledEmails } = await supabase
      .from('scheduled_abandonment_emails')
      .select('resend_email_id')
      .eq('email', customerEmail);

    if (scheduledEmails && scheduledEmails.length > 0) {
      log.info('Cancelling scheduled abandonment emails', { count: scheduledEmails.length, email: customerEmail });

      for (const scheduled of scheduledEmails) {
        try {
          await resend.emails.cancel(scheduled.resend_email_id);
          log.debug('Cancelled abandonment email', { emailId: scheduled.resend_email_id });
        } catch (cancelError) {
          // Email may already be sent or cancelled, non-fatal
          log.debug('Could not cancel abandonment email (may already be sent)', {
            emailId: scheduled.resend_email_id,
            error: cancelError instanceof Error ? cancelError.message : 'Unknown error',
          });
        }
      }

      // Clean up the records
      await supabase
        .from('scheduled_abandonment_emails')
        .delete()
        .eq('email', customerEmail);
    }
  } catch (error) {
    // Non-fatal: log but continue with checkout processing
    log.warn('Failed to cancel abandonment emails', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: customerEmail,
    });
  }

  // Extract name parts
  const nameParts = customerName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  log.debug('Name parsing', {
    fullName: customerName,
    firstName,
    lastName,
  });

  // Get or create Stripe customer
  let stripeCustomerId: string;

  if (typeof session.customer === 'string') {
    stripeCustomerId = session.customer;
    log.debug('Using existing customer ID from session', { stripeCustomerId });
  } else if (session.customer) {
    stripeCustomerId = session.customer.id;
    log.debug('Using customer ID from object', { stripeCustomerId });
  } else {
    log.info('No customer found, creating new customer');
    // Create customer if it doesn't exist
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: {
        session_id: session.id,
      },
    });
    stripeCustomerId = customer.id;
    log.info('Created new customer', { stripeCustomerId });
  }

  // Get line items to determine what was purchased
  log.debug('Fetching line items');
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });

  log.debug('Line items fetched', { count: lineItems.data.length });

  if (!lineItems.data.length) {
    log.error('No line items in checkout session', new Error('No line items in session'), {
      type: 'payment',
      severity: 'high',
      code: 'NO_LINE_ITEMS',
    });
    await serverAnalytics.error(session.id, 'No line items in checkout session', {
      type: 'payment',
      severity: 'high',
      code: 'NO_LINE_ITEMS',
      stack: new Error('No line items in session').stack,
    });
    throw new Error('No line items in session');
  }

  // Categorize line items into tickets, vouchers, and unrecognized products
  const ticketLineItems: Stripe.LineItem[] = [];
  const voucherLineItems: Stripe.LineItem[] = [];
  const unrecognizedLineItems: Stripe.LineItem[] = [];

  for (const item of lineItems.data) {
    const price = item.price as Stripe.Price | undefined;

    if (isWorkshopVoucher(price)) {
      voucherLineItems.push(item);
    } else if (isTicketProduct(price)) {
      ticketLineItems.push(item);
    } else {
      unrecognizedLineItems.push(item);
    }
  }

  log.debug('Line items categorized', {
    total: lineItems.data.length,
    tickets: ticketLineItems.length,
    vouchers: voucherLineItems.length,
    unrecognized: unrecognizedLineItems.length,
  });

  // Warn about unrecognized products
  if (unrecognizedLineItems.length > 0) {
    log.warn('Unrecognized products will be skipped', {
      count: unrecognizedLineItems.length,
    });
    unrecognizedLineItems.forEach(item => {
      const price = item.price as Stripe.Price | undefined;
      log.warn('Unrecognized product', {
        description: item.description,
        lookupKey: price?.lookup_key,
        priceId: price?.id,
      });
    });
  }

  // ====== Process Workshop Vouchers FIRST (they're fast, no database operations) ======
  log.debug('Checking if voucher processing needed', { voucherCount: voucherLineItems.length });

  if (voucherLineItems.length > 0) {
    log.info('Processing workshop vouchers (FAST PATH)', {
      voucherCount: voucherLineItems.length,
      customerEmail,
      firstName,
    });

    // Get current pricing stage to calculate bonus
    const currentStage = getCurrentStage();
    const bonusPercent = currentStage.stage === 'blind_bird' ? 25 : currentStage.stage === 'early_bird' ? 15 : 0;

    log.debug('Current pricing stage', {
      stage: currentStage.stage,
      bonusPercent,
    });

    for (const voucherItem of voucherLineItems) {
      const price = voucherItem.price as Stripe.Price | undefined;
      const quantity = voucherItem.quantity || 1;
      const amountPerVoucher = price?.unit_amount || 0;
      const currency = (price?.currency || session.currency || 'CHF').toUpperCase();

      log.debug('Processing voucher', {
        priceId: price?.id,
        quantity,
        amountPerVoucher: amountPerVoucher / 100,
        currency,
        bonusPercent,
      });

      // Send a voucher email for each quantity
      for (let i = 0; i < quantity; i++) {
        const amountPaid = amountPerVoucher / 100; // Convert cents to regular currency
        const bonusAmount = (amountPaid * bonusPercent) / 100;
        const voucherValue = amountPaid + bonusAmount;

        log.debug(`Sending voucher email ${i + 1}/${quantity}`, { email: customerEmail });

        try {
          const result = await sendVoucherConfirmationEmail({
            to: customerEmail,
            firstName,
            amountPaid,
            voucherValue,
            currency,
            bonusPercent: bonusPercent > 0 ? bonusPercent : undefined,
            orderUrl: undefined, // Vouchers don't have order URLs since they're manually issued
          });

          if (result.success) {
            log.info(`Voucher email ${i + 1}/${quantity} sent successfully`, { email: customerEmail });
          } else {
            log.error(`Failed to send voucher email ${i + 1}/${quantity}`, new Error(result.error || 'Unknown error'), {
              type: 'system',
              severity: 'medium',
              code: 'VOUCHER_EMAIL_FAILED',
              email: customerEmail,
            });
          }

          // Rate limiting delay between voucher emails (600ms = 1.67 emails/sec)
          if (i < quantity - 1) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        } catch (error) {
          log.error(`Error sending voucher email ${i + 1}/${quantity}`, error, {
            type: 'system',
            severity: 'medium',
            code: 'VOUCHER_EMAIL_ERROR',
            email: customerEmail,
          });
          // Non-fatal, continue with other vouchers
        }
      }
    }

    log.info('Workshop vouchers processed', { count: voucherLineItems.length });
  }

  // Parse ticket info if we have tickets
  let ticketInfo: ReturnType<typeof parseTicketInfo> | undefined;
  let ticketDisplayName: string | undefined;

  if (ticketLineItems.length > 0) {
    const price = ticketLineItems[0]?.price as Stripe.Price | undefined;

    if (price?.lookup_key) {
      ticketInfo = parseTicketInfo(price.lookup_key);
      ticketDisplayName = getTicketDisplayName(ticketInfo.category, ticketInfo.stage);

      log.debug('Ticket info parsed', {
        category: ticketInfo.category,
        stage: ticketInfo.stage,
        displayName: ticketDisplayName,
        lookupKey: price.lookup_key,
      });
    }
  }

  // ====== Process Tickets (slower due to DB + PDF generation) ======
  if (ticketLineItems.length > 0 && ticketInfo && ticketDisplayName) {
    log.info('Processing tickets', { ticketCount: ticketLineItems.length });

    // Extract additional customer info from metadata
    const jobTitle = session.metadata?.jobTitle || null;
    const company = session.metadata?.company || null;
    const attendeesJson = session.metadata?.attendees || null;
    const totalTickets = parseInt(session.metadata?.totalTickets || '1', 10);

    log.debug('Additional customer info', {
      company,
      jobTitle,
      totalTickets,
      hasAttendees: !!attendeesJson,
    });

    // Parse attendees if provided (multi-ticket purchase)
    let attendees: Array<{ firstName: string; lastName: string; email: string; company?: string; jobTitle?: string }> = [];

    if (attendeesJson) {
      try {
        attendees = JSON.parse(attendeesJson);
        log.debug('Parsed attendees', { count: attendees.length });
      } catch (error) {
        log.error('Failed to parse attendees JSON', error, {
          type: 'validation',
          severity: 'medium',
          code: 'ATTENDEES_PARSE_ERROR',
        });
      }
    }

    // If no attendees provided, create single ticket for billing customer (legacy behavior)
    if (attendees.length === 0) {
      log.debug('No attendees found, creating single ticket for billing customer');
      attendees = [{
        firstName,
        lastName,
        email: customerEmail,
        company: company ?? undefined,
        jobTitle: jobTitle ?? undefined,
      }];
    }

    // Check if tickets already exist for this session (idempotency for emails)
    log.debug('Checking for existing tickets with session ID', { sessionId: session.id });
    const { createServiceRoleClient } = await import('@/lib/supabase');
    const supabase = createServiceRoleClient();

    const { data: existingTickets, error: checkError } = await supabase
      .from('tickets')
      .select('id, email')
      .eq('stripe_session_id', session.id);

    if (checkError) {
      log.error('Error checking for existing tickets', checkError, {
        type: 'system',
        severity: 'medium',
        code: 'TICKET_CHECK_ERROR',
      });
    }

    if (existingTickets && existingTickets.length > 0) {
      log.warn('Tickets already exist for this session. Skipping ticket creation.', {
        existingTicketCount: existingTickets.length,
        existingTickets: existingTickets.map(t => ({ id: t.id, email: t.email })),
      });
      // Continue to process vouchers if any
    } else {
      // Create tickets for each attendee
      log.info('No existing tickets found. Creating tickets in database', { count: attendees.length });
      const ticketResults: Array<{
        success: boolean;
        ticket?: {
          id: string;
          email: string;
          ticket_type: string;
          amount_paid: number;
          qr_code_url?: string;
        };
        error?: string;
        attendee: {
          firstName: string;
          lastName: string;
          email: string;
          company?: string;
          jobTitle?: string;
        };
      }> = [];

      // Get primary attendee (first one) info for reference
      const primaryAttendee = attendees[0];
      const primaryName = `${primaryAttendee.firstName} ${primaryAttendee.lastName}`;

      for (let i = 0; i < attendees.length; i++) {
        const attendee = attendees[i];
        const isPrimary = i === 0;
        log.debug(`Creating ticket ${i + 1}/${attendees.length}`, {
          email: attendee.email,
          isPrimary,
        });

        const ticketResult = await createTicket({
          ticketType: toLegacyType(ticketInfo.category, ticketInfo.stage),
          ticketCategory: ticketInfo.category,
          ticketStage: ticketInfo.stage,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          company: attendee.company || company,
          jobTitle: attendee.jobTitle || jobTitle,
          stripeCustomerId,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          amountPaid: Math.round((session.amount_total || 0) / attendees.length), // Distribute cost across tickets
          currency: session.currency?.toUpperCase() || 'CHF',
          status: 'confirmed',
          metadata: {
            session_metadata: session.metadata,
            attendeeIndex: i,
            totalAttendees: attendees.length,
            isPrimary, // Mark if this is the primary attendee/purchaser
            billingEmail: customerEmail,
            purchaserName: primaryName, // Store who purchased for all tickets
            purchaserEmail: primaryAttendee.email,
          },
        });

        ticketResults.push({
          success: ticketResult.success,
          ticket: ticketResult.ticket ? {
            id: ticketResult.ticket.id,
            email: ticketResult.ticket.email,
            ticket_type: ticketResult.ticket.ticket_type,
            amount_paid: ticketResult.ticket.amount_paid,
            qr_code_url: ticketResult.ticket.qr_code_url ?? undefined,
          } : undefined,
          error: ticketResult.error,
          attendee,
        });

        if (!ticketResult.success) {
          log.error(`Failed to create ticket ${i + 1}`, new Error(ticketResult.error || 'Unknown error'), {
            type: 'system',
            severity: 'high',
            code: 'TICKET_CREATION_FAILED',
            attendeeEmail: attendee.email,
            attendeeIndex: i,
          });
          // Continue creating other tickets even if one fails
        } else {
          log.info(`Ticket ${i + 1}/${attendees.length} created successfully`, {
            ticketId: ticketResult.ticket?.id,
            email: ticketResult.ticket?.email,
            ticketType: ticketResult.ticket?.ticket_type,
          });
        }
      }

      // Check if any tickets failed
      const failedTickets = ticketResults.filter(r => !r.success);
      if (failedTickets.length > 0) {
        await serverAnalytics.error(stripeCustomerId, `Failed to create ${failedTickets.length} tickets`, {
          type: 'system',
          severity: 'critical',
          code: 'TICKET_CREATION_FAILED',
          stack: new Error(`Failed to create ${failedTickets.length} ticket(s)`).stack,
        });
        throw new Error(`Failed to create ${failedTickets.length} ticket(s)`);
      }

      // Track successful ticket purchases
      for (const result of ticketResults) {
        if (result.success && result.ticket) {
          await serverAnalytics.track('ticket_purchased', result.attendee.email, {
            ticket_id: result.ticket.id,
            ticket_category: ticketInfo.category,
            ticket_stage: ticketInfo.stage,
            ticket_price: result.ticket.amount_paid,
            currency: session.currency?.toUpperCase() || 'CHF',
            ticket_count: 1,
            attendee_count: ticketResults.length,
            email: result.attendee.email,
            company: result.attendee.company,
            payment_status: 'succeeded',
            stripe_session_id: session.id,
            revenue_amount: result.ticket.amount_paid,
            revenue_currency: session.currency?.toUpperCase() || 'CHF',
            revenue_type: 'ticket',
          } as EventProperties<'ticket_purchased'>);
        }
      }

      // Create newsletter contacts for all attendees (ticket purchasers)
      // Note: addNewsletterContact already tracks 'newsletter_subscribed' events to PostHog
      for (const result of ticketResults) {
        if (result.success && result.attendee.email) {
          try {
            const contactResult = await addNewsletterContact(result.attendee.email, 'checkout');
            if (!contactResult.success) {
              await serverAnalytics.error(result.attendee.email, `Failed to create newsletter contact: ${contactResult.error}`, {
                type: 'system',
                severity: 'low',
                code: 'NEWSLETTER_CONTACT_FAILED',
                stack: new Error(contactResult.error).stack,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await serverAnalytics.error(result.attendee.email, `Error creating newsletter contact: ${errorMessage}`, {
              type: 'system',
              severity: 'low',
              code: 'NEWSLETTER_CONTACT_ERROR',
              stack: error instanceof Error ? error.stack : undefined,
            });
            // Non-fatal, continue with other contacts
          }
        }
      }

      // Prepare emails for all attendees with PDFs
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
            console.error('[WebhookHandler] ❌ Ticket ID is missing for attendee:', result.attendee.email);
            continue;
          }

          log.debug('Preparing email', {
            email: result.attendee.email,
            isPrimary,
            hasOrderSummary: isPrimary && ticketResults.length > 1,
          });

          // Prepare notes based on whether this is primary or secondary attendee
          let notes: string | undefined;

          if (isPrimary && ticketResults.length > 1) {
            // Primary attendee gets order summary
            const otherAttendees = ticketResults.slice(1).map(r =>
              `${r.attendee.firstName} ${r.attendee.lastName} (${r.attendee.email})`
            ).join('\n');

            notes = `Order Summary:\n` +
              `Total Tickets: ${ticketResults.length}\n` +
              `Total Amount: ${((session.amount_total || 0) / 100).toFixed(2)} ${session.currency?.toUpperCase() || 'CHF'}\n\n` +
              `Additional Attendees:\n${otherAttendees}\n\n` +
              `Each attendee will receive their individual ticket via email.`;
          } else if (!isPrimary) {
            // Secondary attendees get info about who purchased
            notes = `This ticket was purchased by ${primaryName} (${primaryAttendee.email}).\n\n` +
              `If you have any questions about this ticket, please contact them directly.`;
          }

          // Generate PDF ticket
          let pdfBuffer: Buffer | undefined;
          try {
            if (result.ticket.qr_code_url) {
              log.debug('Generating PDF for ticket', { ticketId });

              // Convert QR code URL to data URL for embedding in PDF
              const qrCodeDataUrl = await imageUrlToDataUrl(result.ticket.qr_code_url);

              // Generate PDF
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
            // Non-fatal, continue with email without PDF
          }

          // Generate order management URL
          const orderUrl = generateOrderUrl(ticketId);

          // Add to email queue
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
          // Non-fatal, continue with other emails
        }
      }

      // Send all ticket emails with rate limiting
      if (emailsToSend.length > 0) {
        const emailResults = await sendTicketConfirmationEmailsQueued(emailsToSend);

        // Log results
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
    } // End of else (ticket creation)

    log.info('Tickets processed', { count: ticketLineItems.length });
  } // End of if (ticketLineItems.length > 0)

  // Track successful webhook processing completion
  const processingTime = Date.now() - startTime;
  await serverAnalytics.track('webhook_received', session.id, {
    webhook_source: 'stripe',
    webhook_event_type: 'checkout.session.completed',
    webhook_id: session.id,
    webhook_processing_time_ms: processingTime,
    webhook_success: true,
  } as EventProperties<'webhook_received'>);
}

/**
 * Handle async payment succeeded
 */
export async function handleAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session
): Promise<void> {
  const log = logger.scope('WebhookHandler', { sessionId: session.id });
  log.info('Processing checkout.session.async_payment_succeeded');
  // Reuse the same logic as checkout completion
  await handleCheckoutSessionCompleted(session);
}

/**
 * Handle async payment failed
 */
export async function handleAsyncPaymentFailed(
  session: Stripe.Checkout.Session
): Promise<void> {
  const log = logger.scope('WebhookHandler', { sessionId: session.id });
  log.error('Async payment failed', new Error('Payment failed'), {
    type: 'payment',
    severity: 'high',
    code: 'ASYNC_PAYMENT_FAILED',
    customerEmail: session.customer_details?.email,
    amount: session.amount_total,
  });
  // TODO: Send notification to user about failed payment
  // For now, just log it
}

/**
 * Handle payment intent succeeded
 * This could be used for direct payment intents (not checkout sessions)
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const log = logger.scope('WebhookHandler', { paymentIntentId: paymentIntent.id });
  log.info('Processing payment_intent.succeeded');
  // TODO: Implement if needed for direct payment flows
}

// Export internal functions for testing
export const __testing = {
  parseTicketInfo,
  getTicketDisplayName,
  toLegacyType,
  isTicketProduct,
  isWorkshopVoucher,
};
