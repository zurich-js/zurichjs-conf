/**
 * Create Ticket
 * Creates a new ticket record after successful payment
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { Ticket, TicketType, TicketCategory, TicketStage, PaymentStatus, Json } from '@/lib/types/database';
import { generateAndStoreTicketQRCode } from '@/lib/qrcode';

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
  ticket?: Ticket;
  error?: string;
}

/**
 * Create a ticket for a user after successful payment
 * This should only be called from the Stripe webhook handler
 */
export async function createTicket(params: CreateTicketParams): Promise<CreateTicketResult> {
  console.log('[createTicket] Starting ticket creation with params:', {
    ticketType: params.ticketType,
    ticketCategory: params.ticketCategory,
    ticketStage: params.ticketStage,
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    company: params.company,
    jobTitle: params.jobTitle,
    stripeSessionId: params.stripeSessionId,
    stripeCustomerId: params.stripeCustomerId,
    amountPaid: params.amountPaid,
    currency: params.currency,
  });

  const supabase = createServiceRoleClient();
  console.log('[createTicket] Supabase service role client created');

  try {
    // Check if ticket already exists (idempotency)
    // Match on both session ID and email to support multi-ticket checkouts
    console.log('[createTicket] Checking for existing ticket with session ID:', params.stripeSessionId, 'and email:', params.email);
    const { data: existing, error: checkError } = await supabase
      .from('tickets')
      .select('*')
      .eq('stripe_session_id', params.stripeSessionId)
      .eq('email', params.email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected
      console.error('[createTicket] Error checking for existing ticket:', checkError);
    }

    if (existing) {
      console.log('[createTicket] Ticket already exists for session:', params.stripeSessionId, 'ticket ID:', existing.id);
      return {
        success: true,
        ticket: existing as Ticket,
      };
    }

    console.log('[createTicket] No existing ticket found, creating new ticket');

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

    console.log('[createTicket] Inserting ticket with data:', ticketData);

    // Create the ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select()
      .single();

    if (error) {
      console.error('[createTicket] Database error creating ticket:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('[createTicket] ✅ Ticket created successfully:', {
      ticketId: ticket?.id,
      email: ticket?.email,
      ticketType: ticket?.ticket_type,
      ticketCategory: ticket?.ticket_category,
      ticketStage: ticket?.ticket_stage,
      company: ticket?.company,
      jobTitle: ticket?.job_title,
    });

    // Generate and store QR code
    console.log('[createTicket] Generating and storing QR code for ticket:', ticket.id);
    const qrResult = await generateAndStoreTicketQRCode(ticket.id);

    if (qrResult.success && qrResult.url) {
      console.log('[createTicket] QR code stored successfully:', qrResult.url);

      // Update ticket with QR code URL
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ qr_code_url: qrResult.url })
        .eq('id', ticket.id);

      if (updateError) {
        console.error('[createTicket] ⚠️ Failed to update ticket with QR URL:', updateError);
        // Non-fatal, ticket was still created
      } else {
        // Update the ticket object with the QR URL
        ticket.qr_code_url = qrResult.url;
      }
    } else {
      console.error('[createTicket] ⚠️ Failed to generate QR code:', qrResult.error);
      // Non-fatal, ticket was still created, QR can be generated on-demand
    }

    return {
      success: true,
      ticket: ticket as Ticket,
    };
  } catch (error) {
    console.error('[createTicket] ❌ Unexpected error in createTicket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
