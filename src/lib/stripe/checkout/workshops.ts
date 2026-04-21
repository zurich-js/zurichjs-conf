/**
 * Workshop Registration Processing
 * Handles workshop purchases from checkout sessions.
 *
 * Authoritative resolution path: each Stripe line item's `lookup_key` is used
 * to find the matching `workshops` row via `getOfferingByLookupKey`. We do
 * NOT trust session metadata for the workshop_id → it can't be tampered with
 * but the less we rely on it, the smaller the blast radius.
 *
 * For each seat in a multi-seat purchase we create one registration row with
 * a distinct `seat_index`, mirroring the ticket flow.
 *
 * On capacity oversell (race condition at the last seat): we issue a Stripe
 * refund for the specific seat's amount, log the incident, and continue
 * processing the remaining seats.
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase';
import { createWorkshopRegistration } from '@/lib/workshops';
import { getOfferingByLookupKey } from '@/lib/workshops/getOfferings';
import { getStripeClient } from '../client';
import { stripCurrencySuffix } from '../ticket-utils';
import { extractPartnershipDiscountInfo } from './helpers';
import { sendWorkshopConfirmationEmail } from '@/lib/email';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { logger } from '@/lib/logger';
import type { Workshop } from '@/lib/types/database';
import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';

export interface WorkshopAttendeeInput {
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  jobTitle?: string | null;
}

interface WorkshopSeatAttendeeMap {
  /** Attendees keyed by workshopId, ordered by seat_index. */
  [workshopId: string]: WorkshopAttendeeInput[];
}

async function resolveWorkshopFromLineItem(
  lineItem: Stripe.LineItem
): Promise<Workshop | null> {
  const price = lineItem.price as Stripe.Price | undefined;
  if (!price?.lookup_key) return null;
  const baseKey = stripCurrencySuffix(price.lookup_key);
  return getOfferingByLookupKey(baseKey);
}

async function loadSpeakerSessionBySubmissionId(
  cfpSubmissionId: string | null
): Promise<{ session: PublicSession; speaker: PublicSpeaker } | null> {
  if (!cfpSubmissionId) return null;
  const { speakers } = await fetchPublicSpeakers();
  for (const speaker of speakers) {
    const match = speaker.sessions.find((s) => s.id === cfpSubmissionId);
    if (match) return { session: match, speaker };
  }
  return null;
}

async function findTicketIdForSession(
  stripeSessionId: string,
  email: string | null
): Promise<string | null> {
  if (!email) return null;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('tickets')
    .select('id')
    .eq('stripe_session_id', stripeSessionId)
    .eq('email', email)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Attendees per-workshop are stored in the cart snapshot table (not Stripe
 * metadata — avoids the 500-char limit and survives multi-workshop carts).
 * Falls back to empty when no snapshot exists; the primary purchaser's info
 * is used as attendee #0 for each seat in that case.
 */
async function loadWorkshopAttendees(
  stripeSessionId: string,
  log: ReturnType<typeof logger.scope>
): Promise<WorkshopSeatAttendeeMap> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('checkout_cart_snapshots')
    .select('workshop_attendees')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (error) {
    log.warn('Failed to load workshop attendees from snapshot', {
      stripeSessionId,
      error: error.message,
    });
    return {};
  }

  const raw = (data as { workshop_attendees?: WorkshopSeatAttendeeMap } | null)?.workshop_attendees;
  return raw ?? {};
}

async function refundSeat({
  session,
  amount,
  reason,
  workshopId,
  seatIndex,
  log,
}: {
  session: Stripe.Checkout.Session;
  amount: number;
  reason: string;
  workshopId: string;
  seatIndex: number;
  log: ReturnType<typeof logger.scope>;
}) {
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    log.error(
      'Cannot refund oversold seat — session has no payment_intent',
      new Error('Missing payment_intent'),
      { workshopId, seatIndex, sessionId: session.id }
    );
    return;
  }

  try {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: 'requested_by_customer',
      metadata: {
        reason,
        workshop_id: workshopId,
        seat_index: String(seatIndex),
        stripe_session_id: session.id,
      },
    });
    log.warn('Issued refund for oversold workshop seat', {
      refundId: refund.id,
      workshopId,
      seatIndex,
      amount,
    });
  } catch (error) {
    log.error(
      'Failed to issue refund for oversold workshop seat — manual intervention required',
      error instanceof Error ? error : new Error(String(error)),
      { workshopId, seatIndex, sessionId: session.id, amount }
    );
  }
}

/**
 * Process workshop line items from a completed checkout session.
 * Creates `workshop_registrations` rows idempotently (keyed by
 * (session, workshop, seat_index)) and refunds any seat that races past
 * capacity.
 */
export async function processWorkshops(
  workshopLineItems: Stripe.LineItem[],
  session: Stripe.Checkout.Session,
  customerEmail: string,
  firstName: string,
  lastName: string,
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  if (workshopLineItems.length === 0) return;

  log.info('Processing workshop registrations', { count: workshopLineItems.length });

  const partnershipDiscountInfo = await extractPartnershipDiscountInfo(session);
  const ticketIdForLink = await findTicketIdForSession(session.id, customerEmail);
  const attendeesByWorkshop = await loadWorkshopAttendees(session.id, log);

  for (const lineItem of workshopLineItems) {
    const price = lineItem.price as Stripe.Price | undefined;
    const workshop = await resolveWorkshopFromLineItem(lineItem);

    if (!workshop) {
      log.warn('Could not resolve workshop for line item — skipping', {
        priceId: price?.id,
        lookupKey: price?.lookup_key,
        description: lineItem.description,
      });
      continue;
    }

    const workshopId = workshop.id;
    const speakerContext = await loadSpeakerSessionBySubmissionId(workshop.cfp_submission_id);
    const quantity = lineItem.quantity || 1;
    const amountPaidPerSeat = Math.round((lineItem.amount_total || 0) / quantity);
    const discountPerSeat = Math.round((lineItem.amount_discount || 0) / quantity);
    const currency = (price?.currency || session.currency || 'CHF').toUpperCase();
    const attendees = attendeesByWorkshop[workshopId] ?? [];

    for (let seatIndex = 0; seatIndex < quantity; seatIndex += 1) {
      const attendee = attendees[seatIndex];
      const seatFirstName = attendee?.firstName ?? firstName ?? '';
      const seatLastName = attendee?.lastName ?? lastName ?? '';
      const seatEmail = attendee?.email ?? customerEmail;

      const result = await createWorkshopRegistration({
        workshopId,
        userId: null,
        ticketId: ticketIdForLink ?? undefined,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
        amountPaid: amountPaidPerSeat,
        currency,
        status: 'confirmed',
        firstName: seatFirstName || null,
        lastName: seatLastName || null,
        email: seatEmail,
        couponCode: partnershipDiscountInfo.couponCode,
        partnershipCouponId: partnershipDiscountInfo.partnershipCouponId,
        partnershipVoucherId: partnershipDiscountInfo.partnershipVoucherId,
        discountAmount: discountPerSeat,
        seatIndex,
        metadata: {
          stripe_line_item_id: lineItem.id,
          lookup_key: price?.lookup_key ?? null,
          company: attendee?.company ?? null,
          job_title: attendee?.jobTitle ?? null,
          total_seats: quantity,
          is_primary: seatIndex === 0,
        },
      });

      if (result.oversold) {
        await refundSeat({
          session,
          amount: amountPaidPerSeat,
          reason: 'workshop_oversold',
          workshopId,
          seatIndex,
          log,
        });
        continue;
      }

      if (!result.success) {
        log.error(
          'Failed to create workshop registration',
          new Error(result.error || 'Unknown error'),
          {
            type: 'system',
            severity: 'high',
            code: 'WORKSHOP_REGISTRATION_FAILED',
            workshopId,
            sessionId: session.id,
            seatIndex,
          }
        );
        continue;
      }

      if (result.duplicate) {
        log.info('Workshop registration already exists (idempotent retry)', {
          workshopId,
          sessionId: session.id,
          seatIndex,
        });
        continue;
      }

      log.info('Workshop registration created', {
        workshopId,
        registrationId: result.registration?.id,
        seatIndex,
        amountPaid: amountPaidPerSeat,
        currency,
        discount: discountPerSeat,
      });

      // Fire-and-forget confirmation email per seat. Failures log but do not
      // abort the webhook — a missing email is less bad than a duplicate
      // registration when Stripe retries.
      if (seatEmail) {
        try {
          await sendWorkshopConfirmationEmail({
            to: seatEmail,
            firstName: seatFirstName || 'there',
            workshopTitle: workshop.title,
            workshopDescription: workshop.description,
            instructorName: speakerContext
              ? [speakerContext.speaker.first_name, speakerContext.speaker.last_name]
                  .filter(Boolean)
                  .join(' ')
              : null,
            date: workshop.date,
            startTime: workshop.start_time,
            endTime: workshop.end_time,
            room: workshop.room,
            amountPaid: amountPaidPerSeat,
            currency,
            seatIndex,
            totalSeats: quantity,
            workshopSlug: speakerContext?.session.slug ?? null,
          });
        } catch (error) {
          log.warn('Failed to send workshop confirmation email', {
            to: seatEmail,
            workshopId,
            seatIndex,
            error: error instanceof Error ? error.message : 'Unknown',
          });
        }
      }
    }
  }

  log.info('Workshop registrations processed', { count: workshopLineItems.length });
}
