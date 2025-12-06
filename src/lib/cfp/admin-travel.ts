/**
 * Admin Travel Management Operations
 * Functions for managing speaker travel, flights, and reimbursements from the admin side
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type {
  CfpSpeaker,
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerAccommodation,
  CfpSpeakerReimbursement,
  CfpReimbursementStatus,
  CfpFlightStatus,
} from '@/lib/types/cfp';

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

// ============================================================================
// Types
// ============================================================================

export interface SpeakerWithTravel extends CfpSpeaker {
  travel: CfpSpeakerTravel | null;
  flights: CfpSpeakerFlight[];
  accommodation: CfpSpeakerAccommodation | null;
  reimbursements: CfpSpeakerReimbursement[];
  accepted_submissions_count: number;
}

export interface TravelDashboardStats {
  total_accepted_speakers: number;
  travel_confirmed: number;
  attending_dinner: number;
  attending_activities: number;
  pending_reimbursements: number;
  total_reimbursement_amount: number;
  flights_arriving_today: number;
  flights_departing_today: number;
}

export interface FlightWithSpeaker extends CfpSpeakerFlight {
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface ReimbursementWithSpeaker extends CfpSpeakerReimbursement {
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// ============================================================================
// Dashboard Stats
// ============================================================================

/**
 * Get travel dashboard statistics
 */
export async function getTravelDashboardStats(): Promise<TravelDashboardStats> {
  const supabase = createCfpServiceClient();
  const today = new Date().toISOString().split('T')[0];

  // Get accepted speakers count
  const { data: acceptedSpeakers } = await supabase
    .from('cfp_submissions')
    .select('speaker_id')
    .eq('status', 'accepted');

  const uniqueSpeakerIds = [...new Set((acceptedSpeakers || []).map((s: { speaker_id: string }) => s.speaker_id))];

  // Get travel stats
  const { data: travelData } = await supabase
    .from('cfp_speaker_travel')
    .select('*')
    .in('speaker_id', uniqueSpeakerIds);

  const travelConfirmed = (travelData || []).filter((t: CfpSpeakerTravel) => t.travel_confirmed).length;
  const attendingDinner = (travelData || []).filter((t: CfpSpeakerTravel) => t.attending_speakers_dinner).length;
  const attendingActivities = (travelData || []).filter((t: CfpSpeakerTravel) => t.attending_speakers_activities).length;

  // Get pending reimbursements
  const { data: pendingReimbursements } = await supabase
    .from('cfp_speaker_reimbursements')
    .select('amount')
    .eq('status', 'pending');

  const pendingCount = (pendingReimbursements || []).length;
  const totalPendingAmount = (pendingReimbursements || []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);

  // Get flights arriving/departing today
  const { data: todayFlights } = await supabase
    .from('cfp_speaker_flights')
    .select('direction, arrival_time, departure_time')
    .in('speaker_id', uniqueSpeakerIds);

  type FlightData = { direction: string; arrival_time: string | null; departure_time: string | null };
  const arrivingToday = (todayFlights || []).filter((f: FlightData) => {
    if (f.direction !== 'inbound' || !f.arrival_time) return false;
    return f.arrival_time.startsWith(today);
  }).length;

  const departingToday = (todayFlights || []).filter((f: FlightData) => {
    if (f.direction !== 'outbound' || !f.departure_time) return false;
    return f.departure_time.startsWith(today);
  }).length;

  return {
    total_accepted_speakers: uniqueSpeakerIds.length,
    travel_confirmed: travelConfirmed,
    attending_dinner: attendingDinner,
    attending_activities: attendingActivities,
    pending_reimbursements: pendingCount,
    total_reimbursement_amount: totalPendingAmount,
    flights_arriving_today: arrivingToday,
    flights_departing_today: departingToday,
  };
}

// ============================================================================
// Speakers with Travel
// ============================================================================

/**
 * Get all accepted speakers with their travel details
 */
export async function getAcceptedSpeakersWithTravel(): Promise<SpeakerWithTravel[]> {
  const supabase = createCfpServiceClient();

  // Get accepted submissions with speaker IDs
  const { data: acceptedSubmissions } = await supabase
    .from('cfp_submissions')
    .select('speaker_id')
    .eq('status', 'accepted');

  if (!acceptedSubmissions || acceptedSubmissions.length === 0) {
    return [];
  }

  const speakerIds = [...new Set(acceptedSubmissions.map((s: { speaker_id: string }) => s.speaker_id))];

  // Get speakers
  const { data: speakers } = await supabase
    .from('cfp_speakers')
    .select('*')
    .in('id', speakerIds)
    .order('last_name');

  if (!speakers || speakers.length === 0) {
    return [];
  }

  // Get all travel data in parallel
  const [travelResult, flightsResult, accommodationResult, reimbursementsResult] = await Promise.all([
    supabase.from('cfp_speaker_travel').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_flights').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_accommodation').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_reimbursements').select('*').in('speaker_id', speakerIds),
  ]);

  // Count accepted submissions per speaker
  const submissionCounts: Record<string, number> = {};
  acceptedSubmissions.forEach((s: { speaker_id: string }) => {
    submissionCounts[s.speaker_id] = (submissionCounts[s.speaker_id] || 0) + 1;
  });

  // Type for DB records
  type DbRecord = { speaker_id: string; [key: string]: unknown };

  // Combine data
  return speakers.map((speaker: CfpSpeaker) => ({
    ...speaker,
    travel: (travelResult.data || []).find((t: DbRecord) => t.speaker_id === speaker.id) || null,
    flights: (flightsResult.data || []).filter((f: DbRecord) => f.speaker_id === speaker.id),
    accommodation: (accommodationResult.data || []).find((a: DbRecord) => a.speaker_id === speaker.id) || null,
    reimbursements: (reimbursementsResult.data || []).filter((r: DbRecord) => r.speaker_id === speaker.id),
    accepted_submissions_count: submissionCounts[speaker.id] || 0,
  })) as SpeakerWithTravel[];
}

/**
 * Get a single speaker's complete travel details
 */
export async function getSpeakerTravelDetails(speakerId: string): Promise<SpeakerWithTravel | null> {
  const supabase = createCfpServiceClient();

  // Get speaker
  const { data: speaker } = await supabase
    .from('cfp_speakers')
    .select('*')
    .eq('id', speakerId)
    .single();

  if (!speaker) {
    return null;
  }

  // Get all travel data in parallel
  const [travelResult, flightsResult, accommodationResult, reimbursementsResult, submissionsResult] = await Promise.all([
    supabase.from('cfp_speaker_travel').select('*').eq('speaker_id', speakerId).single(),
    supabase.from('cfp_speaker_flights').select('*').eq('speaker_id', speakerId),
    supabase.from('cfp_speaker_accommodation').select('*').eq('speaker_id', speakerId).single(),
    supabase.from('cfp_speaker_reimbursements').select('*').eq('speaker_id', speakerId),
    supabase.from('cfp_submissions').select('id').eq('speaker_id', speakerId).eq('status', 'accepted'),
  ]);

  return {
    ...speaker,
    travel: travelResult.data || null,
    flights: flightsResult.data || [],
    accommodation: accommodationResult.data || null,
    reimbursements: reimbursementsResult.data || [],
    accepted_submissions_count: (submissionsResult.data || []).length,
  } as SpeakerWithTravel;
}

// ============================================================================
// Travel Management
// ============================================================================

/**
 * Update speaker travel details (admin)
 */
export async function updateSpeakerTravelAdmin(
  speakerId: string,
  updates: {
    flight_budget_amount?: number;
    flight_budget_currency?: string;
    travel_confirmed?: boolean;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_travel')
    .upsert({
      speaker_id: speakerId,
      ...updates,
      confirmed_at: updates.travel_confirmed ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'speaker_id',
    });

  if (error) {
    console.error('[Admin Travel] Update error:', error);
    return { success: false, error: 'Failed to update travel details' };
  }

  return { success: true, error: null };
}

// ============================================================================
// Accommodation Management
// ============================================================================

/**
 * Set speaker accommodation details (admin)
 */
export async function setSpeakerAccommodation(
  speakerId: string,
  accommodation: {
    hotel_name?: string;
    hotel_address?: string;
    check_in_date?: string;
    check_out_date?: string;
    reservation_number?: string;
    reservation_confirmation_url?: string;
    cost_amount?: number;
    cost_currency?: string;
    is_covered_by_conference?: boolean;
    admin_notes?: string;
  }
): Promise<{ accommodation: CfpSpeakerAccommodation | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speaker_accommodation')
    .upsert({
      speaker_id: speakerId,
      ...accommodation,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'speaker_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[Admin Travel] Accommodation error:', error);
    return { accommodation: null, error: 'Failed to set accommodation' };
  }

  return { accommodation: data as CfpSpeakerAccommodation, error: null };
}

// ============================================================================
// Flight Management
// ============================================================================

/**
 * Get all flights with speaker info
 */
export async function getAllFlights(options?: {
  date?: string;
  direction?: 'inbound' | 'outbound';
}): Promise<FlightWithSpeaker[]> {
  const supabase = createCfpServiceClient();

  // Get accepted speaker IDs first
  const { data: acceptedSubmissions } = await supabase
    .from('cfp_submissions')
    .select('speaker_id')
    .eq('status', 'accepted');

  if (!acceptedSubmissions || acceptedSubmissions.length === 0) {
    return [];
  }

  const speakerIds = [...new Set(acceptedSubmissions.map((s: { speaker_id: string }) => s.speaker_id))];

  // Build flights query
  let query = supabase
    .from('cfp_speaker_flights')
    .select('*')
    .in('speaker_id', speakerIds);

  if (options?.direction) {
    query = query.eq('direction', options.direction);
  }

  if (options?.date) {
    const dateStart = `${options.date}T00:00:00`;
    const dateEnd = `${options.date}T23:59:59`;

    if (options.direction === 'inbound') {
      query = query.gte('arrival_time', dateStart).lte('arrival_time', dateEnd);
    } else if (options.direction === 'outbound') {
      query = query.gte('departure_time', dateStart).lte('departure_time', dateEnd);
    } else {
      // Either arrival or departure on this date
      query = query.or(`arrival_time.gte.${dateStart},departure_time.gte.${dateStart}`)
        .or(`arrival_time.lte.${dateEnd},departure_time.lte.${dateEnd}`);
    }
  }

  const { data: flights } = await query.order('departure_time');

  if (!flights || flights.length === 0) {
    return [];
  }

  // Get speaker info
  type FlightRecord = { speaker_id: string; [key: string]: unknown };
  type SpeakerRecord = { id: string; first_name: string; last_name: string; email: string };
  const flightSpeakerIds = [...new Set(flights.map((f: FlightRecord) => f.speaker_id))];
  const { data: speakers } = await supabase
    .from('cfp_speakers')
    .select('id, first_name, last_name, email')
    .in('id', flightSpeakerIds);

  const speakerMap = new Map((speakers || []).map((s: SpeakerRecord) => [s.id, s]));

  return flights.map((flight: FlightRecord) => ({
    ...flight,
    speaker: speakerMap.get(flight.speaker_id) || {
      id: flight.speaker_id,
      first_name: 'Unknown',
      last_name: 'Speaker',
      email: '',
    },
  })) as FlightWithSpeaker[];
}

/**
 * Update flight status (admin)
 */
export async function updateFlightStatus(
  flightId: string,
  status: CfpFlightStatus,
  trackingUrl?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_flights')
    .update({
      flight_status: status,
      tracking_url: trackingUrl,
      last_status_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', flightId);

  if (error) {
    console.error('[Admin Travel] Flight status update error:', error);
    return { success: false, error: 'Failed to update flight status' };
  }

  return { success: true, error: null };
}

// ============================================================================
// Reimbursement Management
// ============================================================================

/**
 * Get all reimbursements with speaker info
 */
export async function getAllReimbursements(options?: {
  status?: CfpReimbursementStatus;
}): Promise<ReimbursementWithSpeaker[]> {
  const supabase = createCfpServiceClient();

  let query = supabase
    .from('cfp_speaker_reimbursements')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data: reimbursements } = await query;

  if (!reimbursements || reimbursements.length === 0) {
    return [];
  }

  // Get speaker info
  type ReimbursementRecord = { speaker_id: string; [key: string]: unknown };
  type SpeakerInfo = { id: string; first_name: string; last_name: string; email: string };
  const speakerIds = [...new Set(reimbursements.map((r: ReimbursementRecord) => r.speaker_id))];
  const { data: speakers } = await supabase
    .from('cfp_speakers')
    .select('id, first_name, last_name, email')
    .in('id', speakerIds);

  const speakerMap = new Map((speakers || []).map((s: SpeakerInfo) => [s.id, s]));

  return reimbursements.map((reimbursement: ReimbursementRecord) => ({
    ...reimbursement,
    speaker: speakerMap.get(reimbursement.speaker_id) || {
      id: reimbursement.speaker_id,
      first_name: 'Unknown',
      last_name: 'Speaker',
      email: '',
    },
  })) as ReimbursementWithSpeaker[];
}

/**
 * Update reimbursement status (admin)
 */
export async function updateReimbursementStatus(
  reimbursementId: string,
  reviewerId: string,
  status: CfpReimbursementStatus,
  adminNotes?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const updates: Record<string, unknown> = {
    status,
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes;
  }

  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('cfp_speaker_reimbursements')
    .update(updates)
    .eq('id', reimbursementId);

  if (error) {
    console.error('[Admin Travel] Reimbursement status update error:', error);
    return { success: false, error: 'Failed to update reimbursement status' };
  }

  return { success: true, error: null };
}
