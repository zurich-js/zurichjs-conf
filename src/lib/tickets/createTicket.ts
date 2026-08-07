/**
 * Create Ticket
 * Creates a new ticket record after successful payment
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Ticket, TicketType, TicketCategory, TicketStage, PaymentStatus, Json } from '@/lib/types/database';
import { generateAndStoreTicketQRCode } from '@/lib/qrcode';

const log = logger.scope('Ticket Creation');

export interface CreateTicketParams {
  userId?: string; // Optional - tickets can be created without user authentication
  ticketType: TicketType; // Legacy field for backward compatibility
  ticketCategory: TicketCategory; // NEW: Type of ticket (standard, student, vip, etc)
  ticketStage: TicketStage; // NEW: Purchase stage (blind_bird, early_bird, etc)
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  jobTitle?: string | null; // NEW: Job title/role
  stripeCustomerId: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amountPaid: number; // in cents
  currency: string;
  status?: PaymentStatus;
  metadata?: Record<string, unknown>;
  // Partnership tracking fields
  couponCode?: string | null;
  partnershipCouponId?: string | null;
  partnershipVoucherId?: string | null;
  partnershipId?: string | null;
  discountAmount?: number;
}

export interface CreateTicketResult {
  success: boolean;
  ticket?: Ticket & { manage_token_nonce: string };
  error?: string;
}

/**
 * Create a ticket for a user after successful payment
 * This should only be called from the Stripe webhook handler
 */
export async function createTicket(params: CreateTicketParams): Promise<CreateTicketResult> {
  log.info('Starting ticket creation', {
    ticketType: params.ticketType,
    ticketCategory: params.ticketCategory,
    ticketStage: params.ticketStage,
  });

  const supabase = createServiceRoleClient();

  try {
    // Check if ticket already exists (idempotency)
    // Match on both session ID and email to support multi-ticket checkouts
    log.debug('Checking for an existing ticket');
    const { data: existing, error: checkError } = await supabase
      .from('tickets')
      .select('*')
      .eq('stripe_session_id', params.stripeSessionId)
      .eq('email', params.email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected
      log.error('Failed to check for an existing ticket', undefined, {
        code: checkError.code,
      });
    }

    if (existing) {
      log.info('Ticket already exists');
      return {
        success: true,
        ticket: existing as Ticket & { manage_token_nonce: string },
      };
    }

    log.debug('No existing ticket found');

    // Prepare ticket data
    const ticketData = {
      user_id: params.userId || null, // Can be null for guest purchases
      ticket_type: params.ticketType, // Legacy field
      ticket_category: params.ticketCategory, // NEW: Separate category
      ticket_stage: params.ticketStage, // NEW: Separate stage
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      company: params.company || null,
      job_title: params.jobTitle || null, // NEW: Job title
      stripe_customer_id: params.stripeCustomerId,
      stripe_session_id: params.stripeSessionId,
      stripe_payment_intent_id: params.stripePaymentIntentId || null,
      amount_paid: params.amountPaid,
      currency: params.currency,
      status: params.status || 'confirmed',
      metadata: (params.metadata || {}) as Json,
      // Partnership tracking fields
      coupon_code: params.couponCode || null,
      partnership_coupon_id: params.partnershipCouponId || null,
      partnership_voucher_id: params.partnershipVoucherId || null,
      partnership_id: params.partnershipId || null,
      discount_amount: params.discountAmount || 0,
    };

    log.debug('Creating ticket record');

    // Create the ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select()
      .single();

    if (error) {
      log.error('Failed to create ticket record', undefined, {
        code: error.code,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    log.info('Ticket created successfully', {
      ticketType: ticket?.ticket_type,
      ticketCategory: ticket?.ticket_category,
      ticketStage: ticket?.ticket_stage,
    });

    // Generate and store QR code
    log.debug('Generating ticket QR code');
    const qrResult = await generateAndStoreTicketQRCode(ticket.id);

    if (qrResult.success && qrResult.url) {
      log.debug('Ticket QR code generated');

      // Update ticket with QR code URL
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ qr_code_url: qrResult.url })
        .eq('id', ticket.id);

      if (updateError) {
        log.warn('Failed to persist ticket QR code', {
          code: updateError.code,
        });
        // Non-fatal, ticket was still created
      } else {
        // Update the ticket object with the QR URL
        ticket.qr_code_url = qrResult.url;
      }
    } else {
      log.warn('Failed to generate ticket QR code');
      // Non-fatal, ticket was still created, QR can be generated on-demand
    }

    return {
      success: true,
      ticket: ticket as Ticket & { manage_token_nonce: string },
    };
  } catch (error) {
    log.error('Unexpected ticket creation failure', undefined, {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
