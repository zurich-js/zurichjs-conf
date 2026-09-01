/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events for ticket purchases and workshop registrations
 *
 * This webhook:
 * - Verifies Stripe signatures
 * - Creates user profiles in Supabase
 * - Links Stripe customers to users
 * - Creates ticket and workshop registration records
 * - Is idempotent (safe to retry)
 *
 * Error contract: 400 tells Stripe the event is unprocessable (bad signature —
 * no retry); any thrown handler error becomes a 500 so Stripe RETRIES. Partial
 * fulfillment must therefore throw, never swallow — a 200 on a half-done event
 * is money silently lost.
 */

import type Stripe from 'stripe';
import { buffer } from 'micro';
import { withApiHandler } from '@/lib/api/handler';
import { ErrorCodes, FulfillmentError, HttpError } from '@/lib/errors';
import type { ScopedLogger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';
import { verifyWebhookSignature } from '@/lib/stripe/client';
import {
  handleCheckoutSessionCompleted,
  handleAsyncPaymentSucceeded,
  handleAsyncPaymentFailed,
} from '@/lib/stripe/webhookHandlers';

/**
 * Raw body needed for signature verification; maxDuration sized for multi-seat
 * team orders (tickets + QR uploads + PDFs + emails), which used to overrun
 * the default and strand paid orders half-fulfilled.
 */
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

/**
 * Event-id ledger (webhook_events table): dedupes deliveries Stripe sends more
 * than once and records every delivery's outcome for reconciliation. Fails
 * OPEN — if the ledger itself is unreachable, processing proceeds (handlers
 * are idempotent by session/registration), because dropping a paid event is
 * strictly worse than double-checking one.
 *
 * Returns true when the event is already fully processed and must be skipped.
 */
async function alreadyProcessed(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Stripe.Event,
  log: ScopedLogger
): Promise<boolean> {
  const { error: insertError } = await supabase
    .from('webhook_events')
    .insert({ event_id: event.id, type: event.type });

  if (!insertError) return false;

  // 23505 = duplicate event_id: Stripe redelivered. Skip only if the previous
  // delivery finished; a 'processing' (crashed mid-run) or 'failed' row means
  // this retry should run the handlers again.
  if (insertError.code === '23505') {
    const { data: existing, error: readError } = await supabase
      .from('webhook_events')
      .select('status')
      .eq('event_id', event.id)
      .single();

    if (readError) {
      log.warn('Webhook ledger read failed — processing anyway (fail open)', {
        eventId: event.id,
        reason: readError.message,
      });
      return false;
    }

    if (existing.status === 'processed') {
      log.info('Duplicate webhook delivery for already-processed event — skipping', {
        eventId: event.id,
        eventType: event.type,
      });
      return true;
    }

    log.warn('Retrying webhook event whose previous delivery did not complete', {
      eventId: event.id,
      previousStatus: existing.status,
    });
    return false;
  }

  log.warn('Webhook ledger insert failed — processing anyway (fail open)', {
    eventId: event.id,
    reason: insertError.message,
  });
  return false;
}

async function markLedger(
  supabase: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  status: 'processed' | 'failed',
  log: ScopedLogger,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from('webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      error: errorMessage ?? null,
    })
    .eq('event_id', eventId);
  if (error) {
    log.warn('Failed to update webhook ledger', { eventId, status, reason: error.message });
  }
}

export default withApiHandler(
  { scope: 'Stripe Webhook', methods: ['POST'] },
  async (req, res, { log }) => {
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      throw new HttpError(400, 'Missing stripe-signature header', {
        code: ErrorCodes.WEBHOOK_SIGNATURE_INVALID,
      });
    }

    const event = verifyWebhookSignature(buf, signature);
    if (!event) {
      throw new HttpError(400, 'Invalid webhook signature', {
        code: ErrorCodes.WEBHOOK_SIGNATURE_INVALID,
      });
    }

    log.info('Signature verified', { eventType: event.type, eventId: event.id });

    const supabase = createServiceRoleClient();
    if (await alreadyProcessed(supabase, event, log)) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          log.info('Handling checkout.session.completed', {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            customerId:
              typeof session.customer === 'string' ? session.customer : session.customer?.id,
            amountTotal: session.amount_total,
          });
          await handleCheckoutSessionCompleted(session);
          break;
        }

        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as Stripe.Checkout.Session;
          log.info('Handling async_payment_succeeded', { sessionId: session.id });
          await handleAsyncPaymentSucceeded(session);
          break;
        }

        case 'checkout.session.async_payment_failed': {
          const session = event.data.object as Stripe.Checkout.Session;
          log.info('Handling async_payment_failed', { sessionId: session.id });
          await handleAsyncPaymentFailed(session);
          break;
        }

        default:
          log.warn('Unhandled event type', { eventType: event.type });
      }
    } catch (error) {
      await markLedger(
        supabase,
        event.id,
        'failed',
        log,
        error instanceof Error ? error.message : String(error)
      );
      // Rethrow tagged so the 500 (which makes Stripe retry) is searchable as
      // WEBHOOK_PROCESSING_FAILED with the event pinned in context.
      throw new FulfillmentError(`Webhook processing failed: ${event.type}`, {
        cause: error,
        code: ErrorCodes.WEBHOOK_PROCESSING_FAILED,
        fingerprint: `webhook-processing:${event.type}`,
        context: { eventType: event.type, eventId: event.id },
      });
    }

    await markLedger(supabase, event.id, 'processed', log);
    log.info('Webhook handled successfully', { eventType: event.type, eventId: event.id });
    res.status(200).json({ received: true });
  }
);
