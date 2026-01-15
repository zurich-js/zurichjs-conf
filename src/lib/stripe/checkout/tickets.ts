/**
 * Ticket Processing
 * Handles ticket purchases from checkout sessions
 */

import type Stripe from 'stripe';
import type { TicketCategory, TicketStage } from '@/lib/types/database';
import { createTicket } from '@/lib/tickets';
import { createServiceRoleClient } from '@/lib/supabase';
import { addNewsletterContact } from '@/lib/email';
import { serverAnalytics } from '@/lib/analytics/server';
import type { EventProperties } from '@/lib/analytics/events';
import { logger } from '@/lib/logger';
import {
  parseTicketInfo,
  getTicketDisplayName,
  toLegacyType,
} from '../ticket-utils';
import {
  extractPartnershipDiscountInfo,
  type PartnershipDiscountInfo,
} from './helpers';
import { sendTicketConfirmationEmails } from './ticket-emails';

/**
 * Attendee info structure
 */
export interface AttendeeInfo {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
}

/**
 * Ticket creation result
 */
export interface TicketCreationResult {
  success: boolean;
  ticket?: {
    id: string;
    email: string;
    ticket_type: string;
    amount_paid: number;
    qr_code_url?: string;
  };
  error?: string;
  attendee: AttendeeInfo;
}

/**
 * Parse attendees from session metadata or create single attendee from customer info
 */
function parseAttendees(
  session: Stripe.Checkout.Session,
  customerEmail: string,
  firstName: string,
  lastName: string,
  log: ReturnType<typeof logger.scope>
): AttendeeInfo[] {
  const jobTitle = session.metadata?.jobTitle || null;
  const company = session.metadata?.company || null;
  const attendeesJson = session.metadata?.attendees || null;

  log.debug('Additional customer info', {
    company,
    jobTitle,
    totalTickets: parseInt(session.metadata?.totalTickets || '1', 10),
    hasAttendees: !!attendeesJson,
  });

  let attendees: AttendeeInfo[] = [];

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

  return attendees;
}

/**
 * Create tickets in database for all attendees
 */
async function createTicketsInDatabase(
  attendees: AttendeeInfo[],
  ticketInfo: { category: TicketCategory; stage: TicketStage },
  session: Stripe.Checkout.Session,
  stripeCustomerId: string,
  partnershipDiscountInfo: PartnershipDiscountInfo,
  customerEmail: string,
  log: ReturnType<typeof logger.scope>
): Promise<TicketCreationResult[]> {
  const ticketResults: TicketCreationResult[] = [];
  const jobTitle = session.metadata?.jobTitle || null;
  const company = session.metadata?.company || null;

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
      amountPaid: Math.round((session.amount_total || 0) / attendees.length),
      currency: session.currency?.toUpperCase() || 'CHF',
      status: 'confirmed',
      couponCode: partnershipDiscountInfo.couponCode,
      partnershipCouponId: partnershipDiscountInfo.partnershipCouponId,
      partnershipVoucherId: partnershipDiscountInfo.partnershipVoucherId,
      partnershipId: partnershipDiscountInfo.partnershipId,
      discountAmount: Math.round(partnershipDiscountInfo.discountAmount / attendees.length),
      metadata: {
        session_metadata: session.metadata,
        attendeeIndex: i,
        totalAttendees: attendees.length,
        isPrimary,
        billingEmail: customerEmail,
        purchaserName: primaryName,
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
    } else {
      log.info(`Ticket ${i + 1}/${attendees.length} created successfully`, {
        ticketId: ticketResult.ticket?.id,
        email: ticketResult.ticket?.email,
        ticketType: ticketResult.ticket?.ticket_type,
      });
    }
  }

  return ticketResults;
}

/**
 * Track ticket purchases in analytics and create newsletter contacts
 */
async function trackTicketPurchasesAndNewsletterSignups(
  ticketResults: TicketCreationResult[],
  ticketInfo: { category: TicketCategory; stage: TicketStage },
  session: Stripe.Checkout.Session
): Promise<void> {
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
      }
    }
  }
}

/**
 * Process ticket purchases from checkout session
 * Creates tickets, tracks analytics, sends confirmation emails
 */
export async function processTickets(
  ticketLineItems: Stripe.LineItem[],
  session: Stripe.Checkout.Session,
  stripeCustomerId: string,
  customerEmail: string,
  firstName: string,
  lastName: string,
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  if (ticketLineItems.length === 0) return;

  const price = ticketLineItems[0]?.price as Stripe.Price | undefined;
  if (!price?.lookup_key) return;

  const ticketInfo = parseTicketInfo(price.lookup_key);
  const ticketDisplayName = getTicketDisplayName(ticketInfo.category, ticketInfo.stage);

  log.debug('Ticket info parsed', {
    category: ticketInfo.category,
    stage: ticketInfo.stage,
    displayName: ticketDisplayName,
    lookupKey: price.lookup_key,
  });

  log.info('Processing tickets', { ticketCount: ticketLineItems.length });

  const partnershipDiscountInfo = await extractPartnershipDiscountInfo(session);
  if (partnershipDiscountInfo.couponCode) {
    log.info('Partnership discount applied', {
      couponCode: partnershipDiscountInfo.couponCode,
      partnershipId: partnershipDiscountInfo.partnershipId,
      discountAmount: partnershipDiscountInfo.discountAmount,
      isCoupon: !!partnershipDiscountInfo.partnershipCouponId,
      isVoucher: !!partnershipDiscountInfo.partnershipVoucherId,
    });
  }

  const attendees = parseAttendees(session, customerEmail, firstName, lastName, log);

  log.debug('Checking for existing tickets with session ID', { sessionId: session.id });
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
    return;
  }

  log.info('No existing tickets found. Creating tickets in database', { count: attendees.length });
  const ticketResults = await createTicketsInDatabase(
    attendees,
    ticketInfo,
    session,
    stripeCustomerId,
    partnershipDiscountInfo,
    customerEmail,
    log
  );

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

  await trackTicketPurchasesAndNewsletterSignups(ticketResults, ticketInfo, session);
  await sendTicketConfirmationEmails(ticketResults, ticketDisplayName, session, log);

  log.info('Tickets processed', { count: ticketLineItems.length });
}
