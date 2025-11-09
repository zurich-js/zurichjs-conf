/**
 * Create Workshop Registration
 * Creates a new workshop registration after successful payment
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { WorkshopRegistration, PaymentStatus, Json } from '@/lib/types/database';

export interface CreateRegistrationParams {
  workshopId: string;
  userId: string;
  ticketId?: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amountPaid: number; // in cents
  currency: string;
  status?: PaymentStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateRegistrationResult {
  success: boolean;
  registration?: WorkshopRegistration;
  error?: string;
}

/**
 * Create a workshop registration for a user after successful payment
 * This should only be called from the Stripe webhook handler
 */
export async function createWorkshopRegistration(
  params: CreateRegistrationParams
): Promise<CreateRegistrationResult> {
  const supabase = createServiceRoleClient();

  try {
    // Check if registration already exists (idempotency)
    const { data: existing } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('stripe_session_id', params.stripeSessionId)
      .single();

    if (existing) {
      console.log('Registration already exists for session:', params.stripeSessionId);
      return {
        success: true,
        registration: existing as WorkshopRegistration,
      };
    }

    // Check workshop capacity
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('capacity, enrolled_count')
      .eq('id', params.workshopId)
      .single();

    if (workshopError || !workshop) {
      return {
        success: false,
        error: 'Workshop not found',
      };
    }

    if (workshop.enrolled_count >= workshop.capacity) {
      return {
        success: false,
        error: 'Workshop is at full capacity',
      };
    }

    // Create the registration
    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .insert([{
        workshop_id: params.workshopId,
        user_id: params.userId,
        ticket_id: params.ticketId || null,
        stripe_session_id: params.stripeSessionId,
        stripe_payment_intent_id: params.stripePaymentIntentId || null,
        amount_paid: params.amountPaid,
        currency: params.currency,
        status: params.status || 'confirmed',
        metadata: (params.metadata || {}) as Json,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating registration:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      registration: registration as WorkshopRegistration,
    };
  } catch (error) {
    console.error('Error in createWorkshopRegistration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
