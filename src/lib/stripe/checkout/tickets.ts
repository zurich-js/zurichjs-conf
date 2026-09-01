/**
 * Ticket Processing
 * Handles ticket purchases from checkout sessions
 */

import type Stripe from 'stripe';
import type { TicketCategory, TicketStage } from '@/lib/types/database';
import { APPAREL_SIZES, type ApparelSize } from '@/lib/types/ticket-constants';
import { createTicket } from '@/lib/tickets';
import { createServiceRoleClient } from '@/lib/supabase';
import { addNewsletterContact } from '@/lib/email';
import { ErrorCodes, ExternalServiceError, throwIfDbError } from '@/lib/errors';
import { retry } from '@/lib/retry';
import { serverAnalytics } from '@/lib/analytics/server';
import type { EventProperties } from '@/lib/analytics/events';
import { logger } from '@/lib/logger';
import {
  parseTicketInfo,
  getTicketDisplayName,
  toLegacyType,
  isStatusDiscountCategory,
  resolveVerificationCategory,
} from '../ticket-utils';
import {
  extractPartnershipDiscountInfo,
  type PartnershipDiscountInfo,
} from './helpers';
import { sendTicketConfirmationEmails } from './ticket-emails';
import { notifyTicketPurchased, notifyTicketCreationError } from '@/lib/platform-notifications';

/**
 * Attendee info structure
 */
export interface AttendeeInfo {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  /** Apparel sizes collected at checkout (hoodie only for VIP tickets). */
  tshirtSize?: ApparelSize;
  hoodieSize?: ApparelSize;
}

/** Only accept known apparel sizes from session metadata. */
function parseApparelSize(value: string | undefined): ApparelSize | undefined {
  return APPAREL_SIZES.includes(value as ApparelSize) ? (value as ApparelSize) : undefined;
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
    manage_token_nonce: string;
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
      // Single-seat purchases carry the billing contact's sizes directly
      tshirtSize: parseApparelSize(session.metadata?.tshirtSize),
      hoodieSize: parseApparelSize(session.metadata?.hoodieSize),
    }];
  } else {
    // Multi-seat purchases carry sizes in compact keys, index-aligned with
    // the attendees JSON (kept separate to respect Stripe's metadata cap).
    const tshirtSizes = (session.metadata?.attendeeTshirtSizes ?? '').split(',');
    const hoodieSizes = (session.metadata?.attendeeHoodieSizes ?? '').split(',');
    attendees = attendees.map((attendee, index) => ({
      ...attendee,
      tshirtSize: parseApparelSize(tshirtSizes[index]),
      hoodieSize: parseApparelSize(hoodieSizes[index]),
    }));
  }

  return attendees;
}

/**
 * Persist apparel sizes collected at checkout so the /admin apparel follow-up
 * is unnecessary for these tickets. Non-fatal — a failure here must never
 * break ticket fulfilment; holders can still set sizes via manage-order.
 */
async function saveApparelPreferences(
  ticketResults: TicketCreationResult[],
  ticketCategory: TicketCategory,
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  const rows = ticketResults.flatMap((result) => {
    if (!result.success || !result.ticket || !result.attendee.tshirtSize) return [];
    return [{
      ticket_id: result.ticket.id,
      tshirt_size: result.attendee.tshirtSize,
      // Hoodies are part of the VIP package only
      hoodie_size: ticketCategory === 'vip' ? (result.attendee.hoodieSize ?? null) : null,
    }];
  });

  if (rows.length === 0) return;

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('ticket_apparel_preferences')
      .upsert(rows, { onConflict: 'ticket_id' });

    if (error) {
      log.error('Failed to save apparel preferences from checkout', error, {
        type: 'system',
        severity: 'low',
        code: 'APPAREL_PREFERENCES_SAVE_FAILED',
        ticketIds: rows.map((row) => row.ticket_id),
      });
      return;
    }

    log.info('Apparel preferences saved from checkout', { count: rows.length });
  } catch (error) {
    log.error('Unexpected error saving apparel preferences from checkout', error, {
      type: 'system',
      severity: 'low',
      code: 'APPAREL_PREFERENCES_SAVE_ERROR',
    });
  }
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
        manage_token_nonce: ticketResult.ticket.manage_token_nonce,
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
  // Attribute the purchase to the buyer, not the seat holder. One event fires
  // per attendee, and keying them on attendee emails meant a team order landed
  // on PostHog persons who had never fired `checkout_started` — so the last
  // funnel step silently under-reported every multi-seat purchase. The attendee
  // is still on the event via `email`.
  const buyerEmail = session.customer_details?.email?.trim().toLowerCase();

  for (const result of ticketResults) {
    if (result.success && result.ticket) {
      await serverAnalytics.track('ticket_purchased', buyerEmail || result.attendee.email, {
        ticket_id: result.ticket.id,
        ticket_category: ticketInfo.category,
        ticket_stage: ticketInfo.stage,
        ticket_price: result.ticket.amount_paid,
        currency: session.currency?.toUpperCase() || 'CHF',
        ticket_count: 1,
        attendee_count: ticketResults.length,
        email: result.attendee.email,
        buyer_email: buyerEmail,
        is_gift_seat: Boolean(buyerEmail) && buyerEmail !== result.attendee.email.trim().toLowerCase(),
        company: result.attendee.company,
        payment_status: 'succeeded',
        stripe_session_id: session.id,
        revenue_amount: result.ticket.amount_paid,
        revenue_currency: session.currency?.toUpperCase() || 'CHF',
        revenue_type: 'ticket',
      } as EventProperties<'ticket_purchased'>);
    }
  }

  for (let i = 0; i < ticketResults.length; i++) {
    const result = ticketResults[i];
    if (result.success && result.attendee.email) {
      try {
        // Resend rate limits (2 req/s) are retried with backoff instead of a
        // fixed 600ms sleep per attendee inside the webhook.
        const contactResult = await retry(
          async () => {
            const r = await addNewsletterContact(result.attendee.email, 'checkout');
            if (!r.success && /rate.?limit|too many requests/i.test(r.error ?? '')) {
              throw new ExternalServiceError('Resend rate limited adding newsletter contact', {
                code: ErrorCodes.RATE_LIMITED,
              });
            }
            return r;
          },
          {
            attempts: 3,
            baseDelayMs: 700,
            shouldRetry: (err) => err instanceof ExternalServiceError,
            label: 'newsletter-contact',
          }
        );
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
 * Resolve category/stage for a purchased ticket price.
 *
 * Students and unemployed attendees buy the same Stripe price, so the lookup
 * key alone always reads as `student`. Verification payment links carry the
 * approved application's type in their metadata — prefer that so an unemployed
 * attendee isn't recorded (or emailed) as a student.
 */
function resolveTicketInfo(
  lookupKey: string,
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof logger.scope>
): { category: TicketCategory; stage: TicketStage } {
  const ticketInfo = parseTicketInfo(lookupKey);

  // Only refine the shared discounted price — never re-categorize standard/VIP
  if (!isStatusDiscountCategory(ticketInfo.category)) return ticketInfo;

  const verifiedCategory = resolveVerificationCategory(session.metadata);
  if (!verifiedCategory || verifiedCategory === ticketInfo.category) return ticketInfo;

  log.info('Applying verified status category from payment link metadata', {
    lookupKey,
    parsedCategory: ticketInfo.category,
    verifiedCategory,
    verificationId: session.metadata?.verification_id,
  });

  return { ...ticketInfo, category: verifiedCategory };
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

  const ticketInfo = resolveTicketInfo(price.lookup_key, session, log);
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
    .select(
      'id, email, first_name, last_name, ticket_type, amount_paid, qr_code_url, manage_token_nonce, confirmation_email_sent_at'
    )
    .eq('stripe_session_id', session.id);

  // Abort rather than fall through: creating tickets while the idempotency
  // read is failing risks duplicates; a thrown error 500s the webhook and
  // Stripe retries once the database recovers.
  throwIfDbError(checkError, 'Failed to check for existing tickets', {
    context: { sessionId: session.id },
  });

  if (existingTickets && existingTickets.length >= attendees.length) {
    // Webhook retry after a full (or half-done) previous run. Tickets exist —
    // but the previous run may have died between the DB writes and the email
    // dispatch. Resend ONLY the never-sent emails instead of returning early
    // and stranding paid attendees without a ticket email (the old bug).
    const unsent = existingTickets.filter(t => !t.confirmation_email_sent_at);

    if (unsent.length === 0) {
      log.info('All tickets exist and all confirmation emails were sent. Nothing to do.', {
        existingTicketCount: existingTickets.length,
        expectedCount: attendees.length,
      });
      return;
    }

    log.warn('Tickets exist but some confirmation emails were never sent — resending', {
      sessionId: session.id,
      unsentCount: unsent.length,
      existingTicketCount: existingTickets.length,
      unsentTickets: unsent.map(t => ({ id: t.id, email: t.email })),
    });

    const pendingEmailResults: TicketCreationResult[] = unsent.map(t => ({
      success: true,
      ticket: {
        id: t.id,
        email: t.email,
        ticket_type: t.ticket_type,
        amount_paid: t.amount_paid,
        qr_code_url: t.qr_code_url ?? undefined,
        manage_token_nonce: t.manage_token_nonce,
      },
      attendee: {
        firstName: t.first_name,
        lastName: t.last_name,
        email: t.email,
      },
    }));

    await sendTicketConfirmationEmails(pendingEmailResults, ticketDisplayName, session, log);
    return;
  }

  if (existingTickets && existingTickets.length > 0) {
    log.info('Some tickets already exist for this session. Will create remaining tickets.', {
      existingTicketCount: existingTickets.length,
      expectedCount: attendees.length,
    });
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
    const errorMessage = failedTickets.map(r => r.error).filter(Boolean).join('; ') || 'Unknown error';
    notifyTicketCreationError({
      sessionId: session.id,
      buyerEmail: customerEmail,
      ticketType: ticketDisplayName,
      failedCount: failedTickets.length,
      totalCount: attendees.length,
      errorMessage,
    });
    await serverAnalytics.error(stripeCustomerId, `Failed to create ${failedTickets.length} tickets`, {
      type: 'system',
      severity: 'critical',
      code: 'TICKET_CREATION_FAILED',
      stack: new Error(`Failed to create ${failedTickets.length} ticket(s)`).stack,
    });
    throw new Error(`Failed to create ${failedTickets.length} ticket(s)`);
  }

  await saveApparelPreferences(ticketResults, ticketInfo.category, log);

  await trackTicketPurchasesAndNewsletterSignups(ticketResults, ticketInfo, session);
  await sendTicketConfirmationEmails(ticketResults, ticketDisplayName, session, log);

  // Auto-generate VIP perk if this is a VIP ticket
  if (ticketInfo.category === 'vip') {
    await autoGenerateVipPerks(ticketResults, log);
  }

  // Send Slack notification for ticket purchase
  const primaryAttendee = attendees[0];
  notifyTicketPurchased({
    orderId: session.id,
    ticketType: ticketDisplayName,
    quantity: ticketResults.filter(r => r.success).length,
    currency: session.currency?.toUpperCase() || 'CHF',
    amount: session.amount_total || 0,
    buyerName: `${primaryAttendee.firstName} ${primaryAttendee.lastName}`,
    buyerEmail: primaryAttendee.email,
    couponCode: partnershipDiscountInfo.couponCode,
    discountAmount: partnershipDiscountInfo.discountAmount,
  });

  log.info('Tickets processed', { count: ticketLineItems.length });
}

/**
 * Auto-generate VIP perk discount codes for newly purchased VIP tickets
 * Non-fatal — failures do not affect the ticket purchase flow
 */
async function autoGenerateVipPerks(
  ticketResults: TicketCreationResult[],
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  try {
    const { getVipPerkConfig, createVipPerkCoupon, sendVipPerkEmail } = await import('@/lib/vip-perks');
    const config = await getVipPerkConfig();

    if (config.restricted_product_ids.length === 0) {
      log.warn('VIP perk config has no product IDs, skipping auto-generation');
      return;
    }

    for (const result of ticketResults) {
      if (!result.success || !result.ticket) continue;

      try {
        const perk = await createVipPerkCoupon({
          ticket_id: result.ticket.id,
          restricted_product_ids: config.restricted_product_ids,
          discount_percent: config.discount_percent,
          expires_at: config.expires_at || undefined,
        });

        log.info('VIP perk auto-generated', { ticketId: result.ticket.id, code: perk.code });

        if (config.auto_send_email) {
          try {
            await sendVipPerkEmail({
              vip_perk_id: perk.id,
              custom_message: config.custom_email_message || undefined,
            });
          } catch (emailErr) {
            log.warn('Failed to auto-send VIP perk email', { ticketId: result.ticket.id, error: emailErr });
          }
        }
      } catch (perkErr) {
        log.error('Failed to auto-generate VIP perk for ticket', perkErr as Error, {
          ticketId: result.ticket.id,
        });
      }
    }
  } catch (error) {
    log.error('Failed to auto-generate VIP perks', error as Error, {
      type: 'system',
      severity: 'medium',
      code: 'VIP_PERK_AUTO_GENERATE_FAILED',
    });
  }
}
