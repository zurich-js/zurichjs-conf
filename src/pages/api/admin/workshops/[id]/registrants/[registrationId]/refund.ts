/**
 * Refund Workshop Registration API
 * POST /api/admin/workshops/[id]/registrants/[registrationId]/refund
 *
 * Ordering is deliberate: Stripe first, then DB. The reverse would mark
 * registrations refunded that Stripe never refunded. The half-done state this
 * can leave (refunded on Stripe, registration still active and scanning valid
 * at the door) is tagged REFUND_DB_UPDATE_FAILED — critical, alertable, and
 * reconciled by retrying this endpoint (the `charge_already_refunded` guard
 * makes the retry safe). See docs/INCIDENT_RESPONSE.md.
 */

import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, FulfillmentError, HttpError, PaymentError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';

export default withApiHandler(
  { scope: 'Refund Workshop Registration API', methods: ['POST'] },
  async (req, res, { log, requestId }) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id, registrationId } = req.query;
    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      throw new HttpError(400, 'Invalid IDs');
    }

    const supabase = createServiceRoleClient();
    const stripe = getStripeClient();

    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (error || !registration) {
      throw new HttpError(404, 'Registration not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: error,
        context: { workshopId: id, registrationId },
      });
    }

    if (registration.status === 'refunded' || registration.status === 'cancelled') {
      throw new HttpError(
        400,
        registration.status === 'refunded'
          ? 'Registration already refunded'
          : 'Cancelled registrations cannot be refunded from this action'
      );
    }

    if (!registration.stripe_payment_intent_id) {
      throw new HttpError(400, 'No payment intent found for this registration');
    }

    let refundId: string;
    try {
      const refund = await stripe.refunds.create({
        payment_intent: registration.stripe_payment_intent_id,
        amount: registration.amount_paid,
        reason: 'requested_by_customer',
        metadata: {
          workshop_id: id,
          registration_id: registrationId,
          admin_refund: 'true',
        },
      });
      refundId = refund.id;
    } catch (stripeError) {
      if ((stripeError as { code?: string })?.code === 'charge_already_refunded') {
        // A previous attempt refunded on Stripe but died before the DB update
        // (REFUND_DB_UPDATE_FAILED). Falling through to the update below is
        // exactly the reconcile path the incident runbook prescribes.
        log.warn('Payment already refunded on Stripe — reconciling registration status', {
          workshopId: id,
          registrationId,
        });
        const existing = await stripe.refunds.list({
          payment_intent: registration.stripe_payment_intent_id,
          limit: 1,
        });
        refundId = existing.data[0]?.id ?? 'unknown-existing-refund';
      } else {
        throw new PaymentError('Stripe refund failed', {
          cause: stripeError,
          code: ErrorCodes.REFUND_FAILED,
          context: {
            workshopId: id,
            registrationId,
            paymentIntentId: registration.stripe_payment_intent_id,
          },
        });
      }
    }

    log.info('Refund created in Stripe', { workshopId: id, registrationId, refundId });

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update({ status: 'refunded' })
      .eq('id', registrationId);

    if (updateError) {
      // Money already moved; the registration row did not. This MUST page
      // loudly — the seat still scans as valid at the door until reconciled.
      throw new FulfillmentError('Refund succeeded on Stripe but registration update failed', {
        cause: updateError,
        code: ErrorCodes.REFUND_DB_UPDATE_FAILED,
        context: { workshopId: id, registrationId, stripeRefundId: refundId, requestId },
      });
    }

    // enrolled_count is maintained atomically by sync_workshop_enrolled_count_trigger.

    return res.status(200).json({
      success: true,
      message: 'Registration refunded successfully',
      refundId,
    });
  }
);
