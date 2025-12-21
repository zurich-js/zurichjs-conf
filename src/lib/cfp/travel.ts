/**
 * CFP Speaker Travel Operations
 * Functions for managing speaker travel logistics
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type {
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerAccommodation,
  CfpSpeakerReimbursement,
  UpdateCfpSpeakerTravelRequest,
  CreateCfpFlightRequest,
  CreateCfpReimbursementRequest,
} from '../types/cfp';

/**
 * Create untyped Supabase client for CFP tables
 */
function createCfpServiceClient() {
  return createClient(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ============================================
// TRAVEL DETAILS
// ============================================

/**
 * Get speaker travel details
 */
export async function getSpeakerTravel(speakerId: string): Promise<CfpSpeakerTravel | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_travel')
    .select('*')
    .eq('speaker_id', speakerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpSpeakerTravel;
}

/**
 * Create or update speaker travel details
 */
export async function upsertSpeakerTravel(
  speakerId: string,
  updates: UpdateCfpSpeakerTravelRequest
): Promise<{ travel: CfpSpeakerTravel | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  // Check if record exists
  const existing = await getSpeakerTravel(speakerId);

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('cfp_speaker_travel')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('speaker_id', speakerId)
      .select()
      .single();

    if (error) {
      console.error('[CFP Travel] Error updating travel:', error);
      return { travel: null, error: error.message };
    }

    return { travel: data as CfpSpeakerTravel, error: null };
  } else {
    // Insert
    const { data, error } = await supabase
      .from('cfp_speaker_travel')
      .insert({
        speaker_id: speakerId,
        ...updates,
      })
      .select()
      .single();

    if (error) {
      console.error('[CFP Travel] Error creating travel:', error);
      return { travel: null, error: error.message };
    }

    return { travel: data as CfpSpeakerTravel, error: null };
  }
}

/**
 * Confirm travel details
 */
export async function confirmTravel(speakerId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_travel')
    .update({
      travel_confirmed: true,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('speaker_id', speakerId);

  if (error) {
    console.error('[CFP Travel] Error confirming travel:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============================================
// FLIGHTS
// ============================================

/**
 * Get speaker flights
 */
export async function getSpeakerFlights(speakerId: string): Promise<CfpSpeakerFlight[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_flights')
    .select('*')
    .eq('speaker_id', speakerId)
    .order('departure_time', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as CfpSpeakerFlight[];
}

/**
 * Get a single flight by ID
 */
export async function getFlightById(id: string): Promise<CfpSpeakerFlight | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_flights')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpSpeakerFlight;
}

/**
 * Create a new flight
 */
export async function createFlight(
  speakerId: string,
  request: CreateCfpFlightRequest
): Promise<{ flight: CfpSpeakerFlight | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_flights')
    .insert({
      speaker_id: speakerId,
      direction: request.direction,
      airline: request.airline,
      flight_number: request.flight_number,
      departure_airport: request.departure_airport,
      arrival_airport: request.arrival_airport,
      departure_time: request.departure_time,
      arrival_time: request.arrival_time,
      booking_reference: request.booking_reference || null,
      cost_amount: request.cost_amount || null,
      cost_currency: request.cost_currency || 'CHF',
      flight_status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[CFP Travel] Error creating flight:', error);
    return { flight: null, error: error.message };
  }

  return { flight: data as CfpSpeakerFlight, error: null };
}

/**
 * Update a flight
 */
export async function updateFlight(
  id: string,
  speakerId: string,
  updates: Partial<CreateCfpFlightRequest>
): Promise<{ flight: CfpSpeakerFlight | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_flights')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('speaker_id', speakerId)
    .select()
    .single();

  if (error) {
    console.error('[CFP Travel] Error updating flight:', error);
    return { flight: null, error: error.message };
  }

  return { flight: data as CfpSpeakerFlight, error: null };
}

/**
 * Delete a flight
 */
export async function deleteFlight(
  id: string,
  speakerId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_flights')
    .delete()
    .eq('id', id)
    .eq('speaker_id', speakerId);

  if (error) {
    console.error('[CFP Travel] Error deleting flight:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============================================
// ACCOMMODATION
// ============================================

/**
 * Get speaker accommodation
 */
export async function getSpeakerAccommodation(speakerId: string): Promise<CfpSpeakerAccommodation | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_accommodation')
    .select('*')
    .eq('speaker_id', speakerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpSpeakerAccommodation;
}

// ============================================
// REIMBURSEMENTS
// ============================================

/**
 * Get speaker reimbursements
 */
export async function getSpeakerReimbursements(speakerId: string): Promise<CfpSpeakerReimbursement[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_reimbursements')
    .select('*')
    .eq('speaker_id', speakerId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CfpSpeakerReimbursement[];
}

/**
 * Get a single reimbursement by ID
 */
export async function getReimbursementById(id: string): Promise<CfpSpeakerReimbursement | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_reimbursements')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpSpeakerReimbursement;
}

/**
 * Create a reimbursement request
 */
export async function createReimbursement(
  speakerId: string,
  request: CreateCfpReimbursementRequest
): Promise<{ reimbursement: CfpSpeakerReimbursement | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_reimbursements')
    .insert({
      speaker_id: speakerId,
      expense_type: request.expense_type,
      description: request.description,
      amount: request.amount,
      currency: request.currency || 'CHF',
      bank_name: request.bank_name || null,
      bank_account_holder: request.bank_account_holder || null,
      iban: request.iban || null,
      swift_bic: request.swift_bic || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[CFP Travel] Error creating reimbursement:', error);
    return { reimbursement: null, error: error.message };
  }

  return { reimbursement: data as CfpSpeakerReimbursement, error: null };
}

/**
 * Update reimbursement receipt URL
 */
export async function updateReimbursementReceipt(
  id: string,
  speakerId: string,
  receiptUrl: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_reimbursements')
    .update({
      receipt_url: receiptUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('speaker_id', speakerId);

  if (error) {
    console.error('[CFP Travel] Error updating receipt:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get complete travel info for a speaker
 */
export async function getCompleteTravelInfo(speakerId: string): Promise<{
  travel: CfpSpeakerTravel | null;
  flights: CfpSpeakerFlight[];
  accommodation: CfpSpeakerAccommodation | null;
  reimbursements: CfpSpeakerReimbursement[];
}> {
  const [travel, flights, accommodation, reimbursements] = await Promise.all([
    getSpeakerTravel(speakerId),
    getSpeakerFlights(speakerId),
    getSpeakerAccommodation(speakerId),
    getSpeakerReimbursements(speakerId),
  ]);

  return { travel, flights, accommodation, reimbursements };
}
