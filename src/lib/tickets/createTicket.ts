/**
 * Create Ticket
 * Creates a new ticket record after successful payment
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { Ticket, TicketType, TicketCategory, TicketStage, PaymentStatus, Json } from '@/lib/types/database';
import { generateAndStoreTicketQRCode } from '@/lib/qrcode';
import { serverAnalytics } from '@/lib/analytics/server';

export interface CreateTicketParams {
  userId?: string;
  ticketType: TicketType;
  ticketCategory: TicketCategory;
  ticketStage: TicketStage;
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  jobTitle?: string | null;
  stripeCustomerId: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amountPaid: number;
  currency: string;
  status?: PaymentStatus;
  metadata?: Record<string, unknown>;
  // Partnership tracking fields (optional - columns may not exist)
  couponCode?: string | null;
  partnershipCouponId?: string | null;
  partnershipVoucherId?: string | null;
  partnershipId?: string | null;
  discountAmount?: number;
}

export interface CreateTicketResult {
  success: boolean;
  ticket?: Ticket;
  error?: string;
}

/** Track error to PostHog silently (never throws) */
function trackError(distinctId: string, message: string, context: Record<string, unknown>): void {
  serverAnalytics.error(distinctId, message, {
    type: 'system',
    severity: context.severity as 'low' | 'medium' | 'high' | 'critical' || 'medium',
    code: context.code as string,
    ...context,
  }).catch(() => {});
}

/** Check if error is due to missing schema columns */
function isSchemaError(error: { message?: string } | null): boolean {
  return !!error?.message?.includes('schema cache');
}

/**
 * Create a ticket for a user after successful payment
 * This should only be called from the Stripe webhook handler
 */
export async function createTicket(params: CreateTicketParams): Promise<CreateTicketResult> {
  const supabase = createServiceRoleClient();

  try {
    // Check for existing ticket (idempotency)
    const { data: existing, error: checkError } = await supabase
      .from('tickets')
      .select('*')
      .eq('stripe_session_id', params.stripeSessionId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[createTicket] Error checking existing ticket:', checkError);
    }

    if (existing) {
      return { success: true, ticket: existing as Ticket };
    }

    // Core ticket data (always available)
    const coreData = {
      user_id: params.userId || null,
      ticket_type: params.ticketType,
      ticket_category: params.ticketCategory,
      ticket_stage: params.ticketStage,
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      company: params.company || null,
      job_title: params.jobTitle || null,
      stripe_customer_id: params.stripeCustomerId,
      stripe_session_id: params.stripeSessionId,
      stripe_payment_intent_id: params.stripePaymentIntentId || null,
      amount_paid: params.amountPaid,
      currency: params.currency,
      status: params.status || 'confirmed',
      metadata: (params.metadata || {}) as Json,
    };

    // Partnership fields (may not exist in schema)
    const partnershipData = {
      coupon_code: params.couponCode || null,
      partnership_coupon_id: params.partnershipCouponId || null,
      partnership_voucher_id: params.partnershipVoucherId || null,
      partnership_id: params.partnershipId || null,
      discount_amount: params.discountAmount || 0,
    };

    const hasPartnershipData = !!(
      params.couponCode || params.partnershipCouponId ||
      params.partnershipVoucherId || params.partnershipId ||
      (params.discountAmount && params.discountAmount > 0)
    );

    // Try insert with partnership fields, fall back to core-only on schema error
    let ticket: Ticket | null = null;
    let error: { code?: string; message: string; details?: string; hint?: string } | null = null;

    if (hasPartnershipData) {
      const result = await supabase
        .from('tickets')
        .insert([{ ...coreData, ...partnershipData }])
        .select()
        .single();

      if (isSchemaError(result.error)) {
        console.warn('[createTicket] Partnership columns missing, retrying without them');
        trackError(params.email, 'Partnership columns missing from schema', {
          code: 'SCHEMA_CACHE_MISSING_COLUMNS',
          severity: 'medium',
          couponCode: params.couponCode,
          partnershipId: params.partnershipId,
        });

        const fallback = await supabase
          .from('tickets')
          .insert([coreData])
          .select()
          .single();

        ticket = fallback.data as Ticket | null;
        error = fallback.error;

        if (ticket && (params.couponCode || params.partnershipId)) {
          trackError(params.email, 'Partnership data skipped', {
            code: 'PARTNERSHIP_DATA_SKIPPED',
            severity: 'low',
            ticketId: ticket.id,
            couponCode: params.couponCode,
            partnershipId: params.partnershipId,
          });
        }
      } else {
        ticket = result.data as Ticket | null;
        error = result.error;
      }
    } else {
      const result = await supabase
        .from('tickets')
        .insert([coreData])
        .select()
        .single();

      ticket = result.data as Ticket | null;
      error = result.error;
    }

    if (error) {
      console.error('[createTicket] Database error:', error.message);
      trackError(params.email, `Failed to create ticket: ${error.message}`, {
        code: error.code || 'TICKET_CREATION_FAILED',
        severity: 'critical',
      });
      return { success: false, error: error.message };
    }

    if (!ticket) {
      return { success: false, error: 'No ticket returned after insert' };
    }

    // Generate QR code (non-blocking)
    const qrResult = await generateAndStoreTicketQRCode(ticket.id);
    if (qrResult.success && qrResult.url) {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ qr_code_url: qrResult.url })
        .eq('id', ticket.id);

      if (!updateError) {
        ticket.qr_code_url = qrResult.url;
      }
    }

    return { success: true, ticket };
  } catch (error) {
    console.error('[createTicket] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
