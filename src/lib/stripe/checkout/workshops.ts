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
 * Capacity is validated at the cart level before checkout session creation
 * (see `validateWorkshopCartItems`). If a race condition causes an oversell,
 * the seat is skipped and logged for manual resolution.
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase';
import { createWorkshopRegistration } from '@/lib/workshops';
import { getOfferingByLookupKey } from '@/lib/workshops/getOfferings';
import { stripCurrencySuffix } from '../ticket-utils';
import { extractPartnershipDiscountInfo } from './helpers';
import { addNewsletterContact, sendWorkshopConfirmationEmail } from '@/lib/email';
import { notifyWorkshopOversold, notifyWorkshopRegistered } from '@/lib/platform-notifications';
import { generateWorkshopPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateTicketQRCode } from '@/lib/qrcode';
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

/**
 * Process workshop line items from a completed checkout session.
 * Creates `workshop_registrations` rows idempotently (keyed by
 * (session, workshop, seat_index)). Capacity is enforced at the cart level;
 * any oversold seat is logged for manual resolution.
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
        company: attendee?.company ?? session.metadata?.company ?? null,
        jobTitle: attendee?.jobTitle ?? session.metadata?.jobTitle ?? null,
        metadata: {
          stripe_line_item_id: lineItem.id,
          lookup_key: price?.lookup_key ?? null,
          total_seats: quantity,
          is_primary: seatIndex === 0,
        },
      });

      if (result.oversold) {
        const instructorName = speakerContext
          ? [speakerContext.speaker.first_name, speakerContext.speaker.last_name]
              .filter(Boolean)
              .join(' ')
          : null;

        // Do not auto-refund here. Stripe fees are not returned on refunds, so
        // oversold paid seats are escalated for manual resolution instead.
        notifyWorkshopOversold({
          workshopTitle: workshop.title,
          workshopId,
          sessionId: session.id,
          seatIndex,
          currency,
          amount: amountPaidPerSeat,
          buyerName: `${firstName} ${lastName}`.trim(),
          buyerEmail: customerEmail,
          attendeeName: `${seatFirstName} ${seatLastName}`.trim(),
          attendeeEmail: seatEmail,
          instructorName,
        });

        log.error(
          'Workshop oversold — paid seat skipped and escalated for manual resolution',
          new Error('Workshop capacity exceeded'),
          {
            type: 'system',
            severity: 'high',
            code: 'WORKSHOP_OVERSOLD',
            workshopId,
            sessionId: session.id,
            seatIndex,
            amountPaid: amountPaidPerSeat,
            attendeeEmail: seatEmail,
            autoRefunded: false,
          }
        );
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
          const resolvedInstructor = speakerContext
            ? [speakerContext.speaker.first_name, speakerContext.speaker.last_name]
                .filter(Boolean)
                .join(' ')
            : null;

          const timeRange = workshop.start_time && workshop.end_time
            ? `${workshop.start_time.slice(0, 5)} – ${workshop.end_time.slice(0, 5)}`
            : workshop.start_time?.slice(0, 5) ?? null;

          // Generate PDF attachment
          let pdfBuffer: Buffer | undefined;
          const qrUrl = result.registration?.qr_code_url;
          if (qrUrl && result.registration) {
            try {
              const qrDataUrl = qrUrl.startsWith('data:')
                ? qrUrl
                : await imageUrlToDataUrl(qrUrl).catch(() => generateTicketQRCode(result.registration!.id));
              pdfBuffer = await generateWorkshopPDF({
                registrationId: result.registration.id,
                attendeeName: `${seatFirstName} ${seatLastName}`.trim(),
                attendeeEmail: seatEmail,
                workshopTitle: workshop.title,
                instructorName: resolvedInstructor,
                workshopDate: workshop.date ?? 'September 10, 2026',
                workshopTime: timeRange,
                room: workshop.room,
                amountPaid: amountPaidPerSeat,
                currency,
                qrCodeDataUrl: qrDataUrl,
              });
            } catch (pdfError) {
              log.warn('Failed to generate workshop PDF', {
                registrationId: result.registration.id,
                error: pdfError instanceof Error ? pdfError.message : 'Unknown',
              });
            }
          }

          await sendWorkshopConfirmationEmail({
            to: seatEmail,
            firstName: seatFirstName || 'there',
            workshopTitle: workshop.title,
            workshopDescription: workshop.description,
            instructorName: resolvedInstructor,
            date: workshop.date,
            startTime: workshop.start_time,
            endTime: workshop.end_time,
            room: workshop.room,
            amountPaid: amountPaidPerSeat,
            currency,
            seatIndex,
            totalSeats: quantity,
            workshopSlug: speakerContext?.session.slug ?? null,
            qrCodeUrl: result.registration?.qr_code_url ?? null,
            pdfAttachment: pdfBuffer,
          });
        } catch (error) {
          log.warn('Failed to send workshop confirmation email', {
            to: seatEmail,
            workshopId,
            seatIndex,
            error: error instanceof Error ? error.message : 'Unknown',
          });
        }

        try {
          await addNewsletterContact(seatEmail, 'checkout');
        } catch (error) {
          log.warn('Failed to add workshop attendee to newsletter', {
            to: seatEmail,
            workshopId,
            seatIndex,
            error: error instanceof Error ? error.message : 'Unknown',
          });
        }
      }
    }

    const instructorName = speakerContext
      ? [speakerContext.speaker.first_name, speakerContext.speaker.last_name]
          .filter(Boolean)
          .join(' ')
      : null;

    notifyWorkshopRegistered({
      workshopTitle: workshop.title,
      quantity,
      currency,
      amount: lineItem.amount_total || 0,
      buyerName: `${firstName} ${lastName}`.trim(),
      buyerEmail: customerEmail,
      instructorName,
      couponCode: partnershipDiscountInfo.couponCode,
      discountAmount: lineItem.amount_discount || 0,
    });
  }

  log.info('Workshop registrations processed', { count: workshopLineItems.length });
}
