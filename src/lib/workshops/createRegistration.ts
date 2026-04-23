/**
 * Create Workshop Registration
 * Creates a new workshop registration after successful payment.
 *
 * Backed by the `insert_workshop_registration_atomic` Postgres function, which
 * locks the workshops row so concurrent webhook deliveries can't oversell.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Database, WorkshopRegistration, PaymentStatus, Json } from '@/lib/types/database';

const log = logger.scope('Workshop Registration');

export interface CreateRegistrationParams {
  workshopId: string;
  userId?: string | null;
  ticketId?: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amountPaid: number; // in cents
  currency: string;
  status?: PaymentStatus;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  couponCode?: string | null;
  partnershipCouponId?: string | null;
  partnershipVoucherId?: string | null;
  discountAmount?: number; // in cents
  /** 0-based index for multi-seat purchases (same session + workshop). Defaults to 0. */
  seatIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateRegistrationResult {
  success: boolean;
  registration?: WorkshopRegistration;
  /** True when the seat was rejected because the workshop is full. The caller
   *  should issue a Stripe refund for the charged amount. */
  oversold?: boolean;
  /** True when the idempotency check found an existing row. */
  duplicate?: boolean;
  error?: string;
}

interface AtomicInsertRow {
  registration: WorkshopRegistration | null;
  was_oversold: boolean;
  was_duplicate: boolean;
}

type AtomicInsertRpcArgs = Omit<
  Database['public']['Functions']['insert_workshop_registration_atomic']['Args'],
  | 'p_user_id'
  | 'p_ticket_id'
  | 'p_stripe_payment_intent_id'
  | 'p_first_name'
  | 'p_last_name'
  | 'p_email'
  | 'p_coupon_code'
  | 'p_partnership_coupon_id'
  | 'p_partnership_voucher_id'
> & {
  // Supabase type generation currently flattens nullable function params to plain
  // strings, but this RPC is intentionally called with nulls for guest checkout flows.
  p_user_id: string | null;
  p_ticket_id: string | null;
  p_stripe_payment_intent_id: string | null;
  p_first_name: string | null;
  p_last_name: string | null;
  p_email: string | null;
  p_coupon_code: string | null;
  p_partnership_coupon_id: string | null;
  p_partnership_voucher_id: string | null;
};

/**
 * Create a workshop registration for a user after successful payment.
 * This should only be called from the Stripe webhook handler.
 */
export async function createWorkshopRegistration(
  params: CreateRegistrationParams
): Promise<CreateRegistrationResult> {
  const supabase = createServiceRoleClient();
  const seatIndex = params.seatIndex ?? 0;

  try {
    const rpcArgs: AtomicInsertRpcArgs = {
      p_workshop_id: params.workshopId,
      p_user_id: params.userId ?? null,
      p_ticket_id: params.ticketId ?? null,
      p_stripe_session_id: params.stripeSessionId,
      p_stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
      p_amount_paid: params.amountPaid,
      p_currency: params.currency,
      p_status: params.status ?? 'confirmed',
      p_first_name: params.firstName ?? null,
      p_last_name: params.lastName ?? null,
      p_email: params.email ?? null,
      p_coupon_code: params.couponCode ?? null,
      p_partnership_coupon_id: params.partnershipCouponId ?? null,
      p_partnership_voucher_id: params.partnershipVoucherId ?? null,
      p_discount_amount: params.discountAmount ?? 0,
      p_seat_index: seatIndex,
      p_metadata: (params.metadata ?? {}) as Json,
    };

    const { data, error } = await supabase.rpc(
      'insert_workshop_registration_atomic',
      rpcArgs as Database['public']['Functions']['insert_workshop_registration_atomic']['Args']
    );

    if (error) {
      log.error('RPC insert_workshop_registration_atomic failed', error, {
        workshopId: params.workshopId,
        stripeSessionId: params.stripeSessionId,
        seatIndex,
      });
      return { success: false, error: error.message };
    }

    const row = (Array.isArray(data) ? data[0] : data) as AtomicInsertRow | null;
    if (!row) {
      return { success: false, error: 'Empty response from atomic insert' };
    }

    if (row.was_oversold) {
      log.warn('Workshop oversold — registration rejected', {
        workshopId: params.workshopId,
        stripeSessionId: params.stripeSessionId,
        seatIndex,
      });
      return { success: false, oversold: true, error: 'Workshop is at full capacity' };
    }

    if (!row.registration) {
      return { success: false, error: 'Atomic insert returned no registration' };
    }

    return {
      success: true,
      duplicate: row.was_duplicate,
      registration: row.registration,
    };
  } catch (error) {
    log.error(
      'Unexpected error in createWorkshopRegistration',
      error instanceof Error ? error : new Error(String(error)),
      {
        workshopId: params.workshopId,
        stripeSessionId: params.stripeSessionId,
        seatIndex,
      }
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
