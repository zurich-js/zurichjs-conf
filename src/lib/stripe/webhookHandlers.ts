/**
 * Stripe Webhook Event Handlers
 * Centralized handlers for different Stripe webhook events
 */

import type Stripe from 'stripe';
import { getStripeClient } from './client';
import { createTicket } from '@/lib/tickets';
import type { TicketType, TicketCategory, TicketStage } from '@/lib/types/database';
import { sendTicketConfirmationEmailsQueued, type TicketConfirmationData } from '@/lib/email';
import { getCurrentStage, type PriceStage } from '@/config/pricing-stages';
import { generateTicketPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateOrderUrl } from '@/lib/auth/orderToken';

/**
 * Map PriceStage from pricing-stages.ts to TicketStage for database
 * Note: 'standard' in PriceStage maps to 'general_admission' in TicketStage
 */
function mapPriceStageToTicketStage(priceStage: PriceStage): TicketStage {
  const stageMap: Record<PriceStage, TicketStage> = {
    blind_bird: 'blind_bird',
    early_bird: 'early_bird',
    standard: 'general_admission',
    late_bird: 'late_bird',
  };
  return stageMap[priceStage];
}

/**
 * Parse ticket category and stage from price lookup key
 * Lookup key format: {category}_{stage} (e.g., "standard_blind_bird", "vip_early_bird")
 * Special cases: "standard_student_unemployed" for student/unemployed pricing
 * 
 * When no lookup key is provided, uses the current active stage from pricing-stages.ts
 */
function parseTicketInfo(lookupKey: string | null): {
  category: TicketCategory;
  stage: TicketStage;
  legacyType: TicketType;
} {
  if (!lookupKey) {
    // Use current active stage from pricing-stages.ts configuration
    const currentStageConfig = getCurrentStage();
    const ticketStage = mapPriceStageToTicketStage(currentStageConfig.stage);
    
    return {
      category: 'standard',
      stage: ticketStage,
      legacyType: currentStageConfig.stage === 'standard' ? 'standard' : currentStageConfig.stage,
    };
  }

  // Handle student/unemployed special case
  if (lookupKey === 'standard_student_unemployed' || lookupKey.includes('student')) {
    return {
      category: 'student',
      stage: 'general_admission',
      legacyType: 'student',
    };
  }

  if (lookupKey.includes('unemployed')) {
    return {
      category: 'unemployed',
      stage: 'general_admission',
      legacyType: 'unemployed',
    };
  }

  // Extract category and stage from lookup key pattern: category_stage
  const parts = lookupKey.split('_');

  if (parts.length >= 2) {
    const category = parts[0] as TicketCategory;
    const stage = parts[1];

    // Map stage names
    const stageMap: Record<string, TicketStage> = {
      'blind_bird': 'blind_bird',
      'early_bird': 'early_bird',
      'standard': 'general_admission',
      'general': 'general_admission',
      'late_bird': 'late_bird',
    };

    // If stage doesn't match known patterns, use current active stage from pricing-stages.ts
    const ticketStage: TicketStage = stageMap[stage] || mapPriceStageToTicketStage(getCurrentStage().stage);

    // Determine legacy type for backward compatibility
    let legacyType: TicketType = 'standard';
    if (category === 'vip') {
      legacyType = 'vip';
    } else if (category === 'student') {
      legacyType = 'student';
    } else if (category === 'unemployed') {
      legacyType = 'unemployed';
    } else if (stage === 'blind_bird') {
      legacyType = 'blind_bird';
    } else if (stage === 'early_bird') {
      legacyType = 'early_bird';
    } else if (stage === 'late_bird') {
      legacyType = 'late_bird';
    }

    return {
      category: category || 'standard',
      stage: ticketStage,
      legacyType,
    };
  }

  // Final fallback: use current active stage from pricing-stages.ts
  const currentStageConfig = getCurrentStage();
  const ticketStage = mapPriceStageToTicketStage(currentStageConfig.stage);
  
  return {
    category: 'standard',
    stage: ticketStage,
    legacyType: currentStageConfig.stage === 'standard' ? 'standard' : currentStageConfig.stage,
  };
}

/**
 * Get ticket type display name
 */
function getTicketTypeDisplayName(ticketType: TicketType): string {
  const names: Record<TicketType, string> = {
    blind_bird: 'Blind Bird',
    early_bird: 'Early Bird',
    standard: 'Standard',
    student: 'Student',
    unemployed: 'Unemployed',
    late_bird: 'Late Bird',
    vip: 'VIP',
  };

  return names[ticketType] || 'Conference Ticket';
}

/**
 * Handle successful checkout session
 * Creates ticket and user profile records
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('[WebhookHandler] ====== Processing checkout.session.completed ======');
  console.log('[WebhookHandler] Session ID:', session.id);
  console.log('[WebhookHandler] Payment status:', session.payment_status);
  console.log('[WebhookHandler] Session status:', session.status);

  const stripe = getStripeClient();

  // Extract customer information
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'Valued Customer';

  console.log('[WebhookHandler] Customer details:', {
    email: customerEmail,
    name: customerName,
  });

  if (!customerEmail) {
    console.error('[WebhookHandler] ❌ No customer email found in checkout session');
    throw new Error('Customer email is required');
  }

  // Extract name parts
  const nameParts = customerName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  console.log('[WebhookHandler] Name parsing:', {
    fullName: customerName,
    firstName,
    lastName,
  });

  // Get or create Stripe customer
  let stripeCustomerId: string;

  if (typeof session.customer === 'string') {
    stripeCustomerId = session.customer;
    console.log('[WebhookHandler] Using existing customer ID from session:', stripeCustomerId);
  } else if (session.customer) {
    stripeCustomerId = session.customer.id;
    console.log('[WebhookHandler] Using customer ID from object:', stripeCustomerId);
  } else {
    console.log('[WebhookHandler] No customer found, creating new customer...');
    // Create customer if it doesn't exist
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: {
        session_id: session.id,
      },
    });
    stripeCustomerId = customer.id;
    console.log('[WebhookHandler] Created new customer:', stripeCustomerId);
  }

  // Get line items to determine what was purchased
  console.log('[WebhookHandler] Fetching line items...');
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price'],
  });

  console.log('[WebhookHandler] Line items count:', lineItems.data.length);

  if (!lineItems.data.length) {
    console.error('[WebhookHandler] ❌ No line items found in checkout session');
    throw new Error('No line items in session');
  }

  const firstItem = lineItems.data[0];
  const price = firstItem?.price as Stripe.Price | undefined;
  const lookupKey = price?.lookup_key || null;

  // Parse ticket information from lookup key
  const ticketInfo = parseTicketInfo(lookupKey);
  const ticketTypeName = getTicketTypeDisplayName(ticketInfo.legacyType);

  console.log('[WebhookHandler] Ticket information parsed:', {
    lookupKey,
    category: ticketInfo.category,
    stage: ticketInfo.stage,
    legacyType: ticketInfo.legacyType,
    displayName: ticketTypeName,
    priceId: price?.id,
    amount: firstItem?.amount_total,
  });

  // Extract additional customer info from metadata
  const jobTitle = session.metadata?.jobTitle || null;
  const company = session.metadata?.company || null;
  const attendeesJson = session.metadata?.attendees || null;
  const totalTickets = parseInt(session.metadata?.totalTickets || '1', 10);

  console.log('[WebhookHandler] Additional customer info:', {
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
      console.log('[WebhookHandler] Parsed attendees:', attendees.length, 'attendees');
    } catch (error) {
      console.error('[WebhookHandler] Failed to parse attendees JSON:', error);
    }
  }

  // If no attendees provided, create single ticket for billing customer (legacy behavior)
  if (attendees.length === 0) {
    console.log('[WebhookHandler] No attendees found, creating single ticket for billing customer');
    attendees = [{
      firstName,
      lastName,
      email: customerEmail,
      company: company ?? undefined,
      jobTitle: jobTitle ?? undefined,
    }];
  }

  // Check if tickets already exist for this session (idempotency for emails)
  console.log('[WebhookHandler] Checking for existing tickets with session ID:', session.id);
  const { createServiceRoleClient } = await import('@/lib/supabase');
  const supabase = createServiceRoleClient();

  const { data: existingTickets, error: checkError } = await supabase
    .from('tickets')
    .select('id, email')
    .eq('stripe_session_id', session.id);

  if (checkError) {
    console.error('[WebhookHandler] Error checking for existing tickets:', checkError);
  }

  if (existingTickets && existingTickets.length > 0) {
    console.log('[WebhookHandler] ⚠️ Tickets already exist for this session. Skipping creation and emails to prevent duplicates.');
    console.log('[WebhookHandler] Existing tickets:', existingTickets.map(t => ({ id: t.id, email: t.email })));
    console.log('[WebhookHandler] ====== Checkout session processing complete (idempotent) ======');
    return;
  }

  // Create tickets for each attendee
  console.log('[WebhookHandler] No existing tickets found. Creating', attendees.length, 'ticket(s) in database...');
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
    console.log(`[WebhookHandler] Creating ticket ${i + 1}/${attendees.length} for:`, attendee.email, isPrimary ? '(PRIMARY)' : '');

    const ticketResult = await createTicket({
      ticketType: ticketInfo.legacyType, // Legacy field for backward compatibility
      ticketCategory: ticketInfo.category, // NEW: Separate category
      ticketStage: ticketInfo.stage, // NEW: Separate stage
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
      console.error(`[WebhookHandler] ❌ Failed to create ticket ${i + 1}:`, ticketResult.error);
      // Continue creating other tickets even if one fails
    } else {
      console.log(`[WebhookHandler] ✅ Ticket ${i + 1}/${attendees.length} created successfully:`, {
        ticketId: ticketResult.ticket?.id,
        email: ticketResult.ticket?.email,
        ticketType: ticketResult.ticket?.ticket_type,
      });
    }
  }

  // Check if any tickets failed
  const failedTickets = ticketResults.filter(r => !r.success);
  if (failedTickets.length > 0) {
    console.error('[WebhookHandler] ❌ Failed to create', failedTickets.length, 'ticket(s)');
    throw new Error(`Failed to create ${failedTickets.length} ticket(s)`);
  }

  // Prepare emails for all attendees with PDFs
  console.log('[WebhookHandler] Preparing confirmation emails for', ticketResults.length, 'attendee(s)...');
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

      console.log('[WebhookHandler] Preparing email for:', result.attendee.email, isPrimary ? '(PRIMARY with order summary)' : '(SECONDARY)');

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
          console.log('[WebhookHandler] Generating PDF for ticket:', ticketId);

          // Convert QR code URL to data URL for embedding in PDF
          const qrCodeDataUrl = await imageUrlToDataUrl(result.ticket.qr_code_url);

          // Generate PDF
          pdfBuffer = await generateTicketPDF({
            ticketId,
            attendeeName,
            attendeeEmail: result.attendee.email,
            ticketType: ticketTypeName,
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

          console.log('[WebhookHandler] ✅ PDF generated successfully');
        } else {
          console.warn('[WebhookHandler] ⚠️ No QR code URL available, skipping PDF generation');
        }
      } catch (pdfError) {
        console.error('[WebhookHandler] ⚠️ Error generating PDF:', pdfError);
        // Non-fatal, continue with email without PDF
      }

      // Generate order management URL
      const orderUrl = generateOrderUrl(ticketId);

      // Add to email queue
      emailsToSend.push({
        to: result.attendee.email,
        customerName: attendeeName,
        customerEmail: result.attendee.email,
        ticketType: ticketTypeName,
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
      console.error('[WebhookHandler] ⚠️ Error preparing email for', result.attendee.email, ':', error);
      // Non-fatal, continue with other emails
    }
  }

  // Send all emails with rate limiting
  if (emailsToSend.length > 0) {
    const emailResults = await sendTicketConfirmationEmailsQueued(emailsToSend);

    // Log results
    const successfulEmails = emailResults.filter(r => r.success);
    const failedEmails = emailResults.filter(r => !r.success);

    console.log('[WebhookHandler] ✅ Successfully sent', successfulEmails.length, 'email(s)');
    if (failedEmails.length > 0) {
      console.error('[WebhookHandler] ⚠️ Failed to send', failedEmails.length, 'email(s):');
      failedEmails.forEach(r => {
        console.error('[WebhookHandler]   -', r.email, ':', r.error);
      });
    }
  }

  console.log('[WebhookHandler] ====== Checkout session processing complete ======');
}

/**
 * Handle async payment succeeded
 */
export async function handleAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('[WebhookHandler] Processing checkout.session.async_payment_succeeded:', session.id);
  // Reuse the same logic as checkout completion
  await handleCheckoutSessionCompleted(session);
}

/**
 * Handle async payment failed
 */
export async function handleAsyncPaymentFailed(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('[WebhookHandler] ❌ Async payment failed for session:', session.id);
  console.log('[WebhookHandler] Customer:', session.customer_details?.email);
  console.log('[WebhookHandler] Amount:', session.amount_total);
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
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);
  // TODO: Implement if needed for direct payment flows
}
