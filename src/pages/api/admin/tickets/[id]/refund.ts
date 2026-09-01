/**
 * Refund Ticket API
 * POST /api/admin/tickets/[id]/refund
 *
 * Ordering is deliberate: Stripe first, then DB. The reverse would mark
 * tickets refunded that Stripe never refunded. The half-done state this can
 * leave (refunded on Stripe, ticket still `confirmed` and scanning valid at
 * the door) is tagged REFUND_DB_UPDATE_FAILED — critical, alertable, and
 * reconciled by retrying this endpoint (the early `already refunded` guard
 * makes the retry safe). See docs/INCIDENT_RESPONSE.md.
 */

import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, FulfillmentError, HttpError, PaymentError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';

const bodySchema = z.object({
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

export default withApiHandler(
  { scope: 'Refund Ticket API', methods: ['POST'], bodySchema },
  async (req, res, { log, body, requestId }) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id } = req.query;
    if (typeof id !== 'string') {
      throw new HttpError(400, 'Invalid ticket ID');
    }

    const supabase = createServiceRoleClient();
    const stripe = getStripeClient();

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      throw new HttpError(404, 'Ticket not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: error,
        context: { ticketId: id },
      });
    }

    if (ticket.status === 'refunded') {
      throw new HttpError(400, 'Ticket already refunded');
    }

    if (!ticket.stripe_payment_intent_id) {
      throw new HttpError(400, 'No payment intent found for this ticket');
    }

    let refundId: string;
    try {
      const refund = await stripe.refunds.create({
        payment_intent: ticket.stripe_payment_intent_id,
        reason: body.reason ?? 'requested_by_customer',
      });
      refundId = refund.id;
    } catch (stripeError) {
      if ((stripeError as { code?: string })?.code === 'charge_already_refunded') {
        // A previous attempt refunded on Stripe but died before the DB update
        // (REFUND_DB_UPDATE_FAILED). Falling through to the update below is
        // exactly the reconcile path the incident runbook prescribes.
        log.warn('Payment already refunded on Stripe — reconciling ticket status', {
          ticketId: id,
        });
        const existing = await stripe.refunds.list({
          payment_intent: ticket.stripe_payment_intent_id,
          limit: 1,
        });
        refundId = existing.data[0]?.id ?? 'unknown-existing-refund';
      } else {
        throw new PaymentError('Stripe refund failed', {
          cause: stripeError,
          code: ErrorCodes.REFUND_FAILED,
          context: { ticketId: id, paymentIntentId: ticket.stripe_payment_intent_id },
        });
      }
    }

    log.info('Refund created in Stripe', { ticketId: id, refundId });

    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'refunded' })
      .eq('id', id);

    if (updateError) {
      // Money already moved; the ticket row did not. This MUST page loudly —
      // the ticket still scans as valid at the door until reconciled.
      throw new FulfillmentError('Refund succeeded on Stripe but ticket update failed', {
        cause: updateError,
        code: ErrorCodes.REFUND_DB_UPDATE_FAILED,
        context: { ticketId: id, stripeRefundId: refundId, requestId },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket refunded successfully',
      refundId,
    });
  }
);
