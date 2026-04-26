/**
 * Admin Travel Management Operations
 * Functions for managing speaker travel, flights, and reimbursements from the admin side
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import type {
  CfpSpeaker,
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerAccommodation,
  CfpSpeakerReimbursement,
  CfpReimbursementStatus,
  CfpFlightStatus,
  CfpTransportMode,
  CfpTransportStatus,
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
  program_sessions_count: number;
  attending_after_party: boolean | null;
  attending_post_conf: boolean | null;
}

export interface TravelDashboardStats {
  total_program_speakers: number;
  travel_confirmed: number;
  attending_dinner: number;
  attending_after_party: number;
  attending_post_conf: number;
  pending_reimbursements: number;
  total_reimbursement_amount: number;
  flights_arriving_today: number;
  flights_departing_today: number;
}

export interface TransportWithSpeaker extends CfpSpeakerFlight {
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  transport_mode: CfpTransportMode;
  transport_status: CfpTransportStatus;
  provider: string | null;
  reference_code: string | null;
  departure_label: string | null;
  arrival_label: string | null;
  transport_link_url: string | null;
  google_search_url: string | null;
}

export type FlightWithSpeaker = TransportWithSpeaker;

type TravelAttendanceMetadata = {
  attending_after_party?: boolean | null;
  attending_post_conf?: boolean | null;
};

type ProgramSpeakerWithSubmissions = Awaited<ReturnType<typeof getAdminSpeakersWithSubmissions>>[number];

function getTravelAttendanceMetadata(
  travel: Pick<CfpSpeakerTravel, 'metadata'> | null | undefined
): TravelAttendanceMetadata {
  if (!travel || !travel.metadata || typeof travel.metadata !== 'object' || Array.isArray(travel.metadata)) {
    return {};
  }

  const metadata = travel.metadata as Record<string, unknown>;

  return {
    attending_after_party: typeof metadata.attending_after_party === 'boolean' ? metadata.attending_after_party : null,
    attending_post_conf: typeof metadata.attending_post_conf === 'boolean' ? metadata.attending_post_conf : null,
  };
}

async function getManagedProgramSpeakers(): Promise<ProgramSpeakerWithSubmissions[]> {
  const speakers = await getAdminSpeakersWithSubmissions('program');

  return [...speakers].sort((a, b) => {
    const lastNameCompare = a.last_name.localeCompare(b.last_name);
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.first_name.localeCompare(b.first_name);
  });
}

const FLIGHTAWARE_AIRLINE_PREFIXES: Record<string, string> = {
  LX: 'SWR',
  LH: 'DLH',
  BA: 'BAW',
  AF: 'AFR',
  KL: 'KLM',
  OS: 'AUA',
  SN: 'BEL',
  TP: 'TAP',
  IB: 'IBE',
  EK: 'UAE',
  U2: 'EZY',
  EW: 'EWG',
  W6: 'WZZ',
};

function normalizeTransportMode(transport: CfpSpeakerFlight): CfpTransportMode {
  return transport.transport_mode || 'flight';
}

function mapLegacyFlightStatus(status: CfpFlightStatus | null | undefined): CfpTransportStatus {
  if (status === 'delayed') return 'delayed';
  if (status === 'cancelled') return 'canceled';
  if (status === 'departed' || status === 'arrived') return 'complete';
  return 'scheduled';
}

function normalizeTransportStatus(transport: CfpSpeakerFlight): CfpTransportStatus {
  return transport.transport_status || mapLegacyFlightStatus(transport.flight_status);
}

function getTransportProvider(transport: CfpSpeakerFlight): string | null {
  return transport.provider || transport.airline || null;
}

function getTransportReferenceCode(transport: CfpSpeakerFlight): string | null {
  return transport.reference_code || transport.flight_number || null;
}

function getTransportDepartureLabel(transport: CfpSpeakerFlight): string | null {
  return transport.departure_label || transport.departure_airport || null;
}

function getTransportArrivalLabel(transport: CfpSpeakerFlight): string | null {
  return transport.arrival_label || transport.arrival_airport || null;
}

function buildFlightAwareUrl(referenceCode: string | null | undefined): string | null {
  if (!referenceCode) return null;

  const cleaned = referenceCode.replace(/\s+/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z0-9]{2,3})(\d{1,4}[A-Z]?)$/);
  if (!match) {
    return `https://www.flightaware.com/live/flight/${encodeURIComponent(cleaned)}`;
  }

  const [, prefix, number] = match;
  const mappedPrefix = FLIGHTAWARE_AIRLINE_PREFIXES[prefix] || prefix;
  return `https://www.flightaware.com/live/flight/${mappedPrefix}${number}`;
}

function buildTransportGoogleSearchUrl(transport: CfpSpeakerFlight): string | null {
  const terms = [
    getTransportProvider(transport),
    getTransportReferenceCode(transport),
    getTransportDepartureLabel(transport),
    getTransportArrivalLabel(transport),
  ].filter(Boolean);

  if (terms.length === 0) return null;
  return `https://www.google.com/search?q=${encodeURIComponent(terms.join(' '))}`;
}

function getTransportLinkUrl(transport: CfpSpeakerFlight): string | null {
  if (transport.transport_link_url) return transport.transport_link_url;

  const mode = normalizeTransportMode(transport);
  if (mode === 'flight') {
    return transport.tracking_url || buildFlightAwareUrl(getTransportReferenceCode(transport));
  }

  return transport.tracking_url || null;
}

function normalizeTransportRecord(transport: CfpSpeakerFlight): CfpSpeakerFlight {
  return {
    ...transport,
    transport_mode: normalizeTransportMode(transport),
    transport_status: normalizeTransportStatus(transport),
    provider: getTransportProvider(transport),
    reference_code: getTransportReferenceCode(transport),
    departure_label: getTransportDepartureLabel(transport),
    arrival_label: getTransportArrivalLabel(transport),
    transport_link_url: getTransportLinkUrl(transport),
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
  const speakers = await getManagedProgramSpeakers();
  const speakerIds = speakers.map((speaker) => speaker.id);

  if (speakerIds.length === 0) {
    return {
      total_program_speakers: 0,
      travel_confirmed: 0,
      attending_dinner: 0,
      attending_after_party: 0,
      attending_post_conf: 0,
      pending_reimbursements: 0,
      total_reimbursement_amount: 0,
      flights_arriving_today: 0,
      flights_departing_today: 0,
    };
  }

  // Get travel stats
  const { data: travelData } = await supabase
    .from('cfp_speaker_travel')
    .select('*')
    .in('speaker_id', speakerIds);

  const travelConfirmed = (travelData || []).filter((t: CfpSpeakerTravel) => t.travel_confirmed).length;
  const attendingDinner = (travelData || []).filter((t: CfpSpeakerTravel) => t.attending_speakers_dinner).length;
  const attendingAfterParty = (travelData || []).filter(
    (t: CfpSpeakerTravel) => getTravelAttendanceMetadata(t).attending_after_party
  ).length;
  const attendingPostConf = (travelData || []).filter(
    (t: CfpSpeakerTravel) => getTravelAttendanceMetadata(t).attending_post_conf
  ).length;

  // Get pending reimbursements
  const { data: pendingReimbursements } = await supabase
    .from('cfp_speaker_reimbursements')
    .select('amount')
    .in('speaker_id', speakerIds)
    .eq('status', 'pending');

  const pendingCount = (pendingReimbursements || []).length;
  const totalPendingAmount = (pendingReimbursements || []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);

  // Get flights arriving/departing today
  const { data: todayFlights } = await supabase
    .from('cfp_speaker_flights')
    .select('direction, arrival_time, departure_time')
    .in('speaker_id', speakerIds);

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
    total_program_speakers: speakerIds.length,
    travel_confirmed: travelConfirmed,
    attending_dinner: attendingDinner,
    attending_after_party: attendingAfterParty,
    attending_post_conf: attendingPostConf,
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
 * Get all managed program speakers with their travel details
 */
export async function getManagedSpeakersWithTravel(): Promise<SpeakerWithTravel[]> {
  const supabase = createCfpServiceClient();
  const speakers = await getManagedProgramSpeakers();

  if (speakers.length === 0) {
    return [];
  }

  const speakerIds = speakers.map((speaker) => speaker.id);

  // Get all travel data in parallel
  const [travelResult, flightsResult, accommodationResult, reimbursementsResult] = await Promise.all([
    supabase.from('cfp_speaker_travel').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_flights').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_accommodation').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_reimbursements').select('*').in('speaker_id', speakerIds),
  ]);

  // Type for DB records
  type DbRecord = { speaker_id: string; [key: string]: unknown };

  // Combine data
  return speakers.map((speaker) => {
    const speakerTravel = ((travelResult.data || []).find((t: DbRecord) => t.speaker_id === speaker.id) || null) as CfpSpeakerTravel | null;

    return {
      ...speaker,
      travel: speakerTravel,
      flights: (flightsResult.data || [])
        .filter((f: DbRecord) => f.speaker_id === speaker.id)
        .map((flight) => normalizeTransportRecord(flight as CfpSpeakerFlight)),
      accommodation: (accommodationResult.data || []).find((a: DbRecord) => a.speaker_id === speaker.id) || null,
      reimbursements: (reimbursementsResult.data || []).filter((r: DbRecord) => r.speaker_id === speaker.id),
      program_sessions_count: speaker.submissions.length,
      attending_after_party: getTravelAttendanceMetadata(speakerTravel).attending_after_party ?? null,
      attending_post_conf: getTravelAttendanceMetadata(speakerTravel).attending_post_conf ?? null,
    };
  }) as SpeakerWithTravel[];
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
    flights: (flightsResult.data || []).map((flight) => normalizeTransportRecord(flight as CfpSpeakerFlight)),
    accommodation: accommodationResult.data || null,
    reimbursements: reimbursementsResult.data || [],
    program_sessions_count: (submissionsResult.data || []).length,
    attending_after_party: getTravelAttendanceMetadata(travelResult.data || null).attending_after_party ?? null,
    attending_post_conf: getTravelAttendanceMetadata(travelResult.data || null).attending_post_conf ?? null,
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
    arrival_date?: string | null;
    departure_date?: string | null;
    attending_speakers_dinner?: boolean | null;
    attending_speakers_activities?: boolean | null;
    dietary_restrictions?: string | null;
    accessibility_needs?: string | null;
    flight_budget_amount?: number;
    flight_budget_currency?: string;
    travel_confirmed?: boolean;
    attending_after_party?: boolean | null;
    attending_post_conf?: boolean | null;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();
  const { data: existingTravel } = await supabase
    .from('cfp_speaker_travel')
    .select('metadata')
    .eq('speaker_id', speakerId)
    .maybeSingle();

  const mergedMetadata: Record<string, unknown> = {
    ...((existingTravel?.metadata as Record<string, unknown> | null) || {}),
  };

  if (updates.attending_after_party !== undefined) {
    mergedMetadata.attending_after_party = updates.attending_after_party;
  }

  if (updates.attending_post_conf !== undefined) {
    mergedMetadata.attending_post_conf = updates.attending_post_conf;
  }

  const payload: Record<string, unknown> = {
    speaker_id: speakerId,
    updated_at: new Date().toISOString(),
    metadata: mergedMetadata,
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'attending_after_party' && key !== 'attending_post_conf') {
      payload[key] = value;
    }
  }

  if (updates.travel_confirmed) {
    payload.confirmed_at = new Date().toISOString();
  } else if (updates.travel_confirmed === false) {
    payload.confirmed_at = null;
  }

  const { error } = await supabase
    .from('cfp_speaker_travel')
    .upsert(payload, {
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
}): Promise<TransportWithSpeaker[]> {
  const supabase = createCfpServiceClient();
  const managedSpeakers = await getManagedProgramSpeakers();
  const speakerIds = managedSpeakers.map((speaker) => speaker.id);

  if (speakerIds.length === 0) {
    return [];
  }

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
  const { data: speakerRows } = await supabase
    .from('cfp_speakers')
    .select('id, first_name, last_name, email')
    .in('id', flightSpeakerIds);

  const speakerMap = new Map((speakerRows || []).map((s: SpeakerRecord) => [s.id, s]));

  return flights.map((flight: FlightRecord) => {
    const normalized = normalizeTransportRecord(flight as unknown as CfpSpeakerFlight);

    return {
      ...normalized,
      speaker: speakerMap.get(flight.speaker_id) || {
        id: flight.speaker_id,
        first_name: 'Unknown',
        last_name: 'Speaker',
        email: '',
      },
      transport_mode: normalizeTransportMode(normalized),
      transport_status: normalizeTransportStatus(normalized),
      provider: getTransportProvider(normalized),
      reference_code: getTransportReferenceCode(normalized),
      departure_label: getTransportDepartureLabel(normalized),
      arrival_label: getTransportArrivalLabel(normalized),
      transport_link_url: getTransportLinkUrl(normalized),
      google_search_url: buildTransportGoogleSearchUrl(normalized),
    };
  }) as TransportWithSpeaker[];
}

function mapTransportStatusToLegacyFlightStatus(status: CfpTransportStatus): CfpFlightStatus {
  switch (status) {
    case 'delayed':
      return 'delayed';
    case 'canceled':
      return 'cancelled';
    case 'complete':
      return 'arrived';
    default:
      return 'confirmed';
  }
}

/**
 * Update flight status (admin)
 */
export async function updateFlightStatus(
  flightId: string,
  status: CfpTransportStatus,
  trackingUrl?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_flights')
    .update({
      transport_status: status,
      flight_status: mapTransportStatusToLegacyFlightStatus(status),
      transport_link_url: trackingUrl,
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

export async function upsertSpeakerTransportLegsAdmin(
  speakerId: string,
  legs: Array<{
    direction: 'inbound' | 'outbound';
    transport_mode: CfpTransportMode;
    transport_status: CfpTransportStatus;
    provider?: string | null;
    reference_code?: string | null;
    departure_label?: string | null;
    arrival_label?: string | null;
    departure_time?: string | null;
    arrival_time?: string | null;
    transport_link_url?: string | null;
    admin_notes?: string | null;
  }>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();
  const now = new Date().toISOString();

  for (const leg of legs) {
    const hasMeaningfulData = leg.transport_mode !== 'none' || Boolean(
      leg.provider ||
      leg.reference_code ||
      leg.departure_label ||
      leg.arrival_label ||
      leg.transport_link_url ||
      leg.admin_notes ||
      leg.departure_time ||
      leg.arrival_time
    );

    if (!hasMeaningfulData || leg.transport_mode === 'none') {
      const { error: deleteError } = await supabase
        .from('cfp_speaker_flights')
        .delete()
        .eq('speaker_id', speakerId)
        .eq('direction', leg.direction);

      if (deleteError) {
        return { success: false, error: 'Failed to clear transport leg' };
      }

      continue;
    }

    const legacyFlightStatus = mapTransportStatusToLegacyFlightStatus(leg.transport_status);
    const provider = leg.provider?.trim() || null;
    const referenceCode = leg.reference_code?.trim() || null;
    const departureLabel = leg.departure_label?.trim() || null;
    const arrivalLabel = leg.arrival_label?.trim() || null;
    const transportLinkUrl = leg.transport_link_url?.trim() || null;
    const adminNotes = leg.admin_notes?.trim() || null;

    const { error } = await supabase
      .from('cfp_speaker_flights')
      .upsert({
        speaker_id: speakerId,
        direction: leg.direction,
        transport_mode: leg.transport_mode,
        transport_status: leg.transport_status,
        provider,
        reference_code: referenceCode,
        departure_label: departureLabel,
        arrival_label: arrivalLabel,
        departure_time: leg.departure_time || null,
        arrival_time: leg.arrival_time || null,
        transport_link_url: transportLinkUrl,
        admin_notes: adminNotes,
        airline: leg.transport_mode === 'flight' ? provider : null,
        flight_number: leg.transport_mode === 'flight' ? referenceCode : null,
        departure_airport: leg.transport_mode === 'flight' ? departureLabel : null,
        arrival_airport: leg.transport_mode === 'flight' ? arrivalLabel : null,
        tracking_url: transportLinkUrl,
        flight_status: legacyFlightStatus,
        last_status_update: now,
        updated_at: now,
      }, {
        onConflict: 'speaker_id,direction',
      });

    if (error) {
      console.error('[Admin Travel] Transport upsert error:', error);
      return { success: false, error: 'Failed to save transportation details' };
    }
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
  const managedSpeakers = await getManagedProgramSpeakers();
  const speakerIds = managedSpeakers.map((speaker) => speaker.id);

  if (speakerIds.length === 0) {
    return [];
  }

  let query = supabase
    .from('cfp_speaker_reimbursements')
    .select('*')
    .in('speaker_id', speakerIds)
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
  const reimbursementSpeakerIds = [...new Set(reimbursements.map((r: ReimbursementRecord) => r.speaker_id))];
  const { data: speakerRows } = await supabase
    .from('cfp_speakers')
    .select('id, first_name, last_name, email')
    .in('id', reimbursementSpeakerIds);

  const speakerMap = new Map((speakerRows || []).map((s: SpeakerInfo) => [s.id, s]));

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
