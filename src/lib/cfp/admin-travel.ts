/**
 * Admin Travel Management Operations
 * Functions for managing speaker travel, flights, invoices, and accommodation from the admin side
 */

import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import type {
  CfpSpeaker,
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerAccommodation,
  CfpSpeakerReimbursement,
  CfpReimbursementStatus,
  CfpReimbursementType,
  CfpFlightStatus,
  CfpFlightDirection,
} from '@/lib/types/cfp';

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
  pending_invoices: number;
  total_invoice_amounts: Record<string, number>;
  flights_arriving_today: number;
  flights_departing_today: number;
  hotels_booked: number;
  hotels_pending: number;
  total_hotel_nights: number;
}

export interface FlightWithSpeaker extends CfpSpeakerFlight {
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

/** Invoice data stored in cfp_speaker_reimbursements, managed admin-side */
export interface InvoiceWithSpeaker extends CfpSpeakerReimbursement {
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Keep alias for backward compat
export type ReimbursementWithSpeaker = InvoiceWithSpeaker;

// ============================================================================
// Speaker Sourcing (matches admin speakers "program" scope)
// ============================================================================

/**
 * Get all speaker IDs that should appear in travel management.
 * Matches the admin speakers tab logic: accepted submissions OR admin-managed/featured/visible.
 */
async function getProgramSpeakerIds(): Promise<string[]> {
  const supabase = createCfpServiceClient();

  // Get speaker IDs with accepted submissions
  const { data: acceptedSubmissions } = await supabase
    .from('cfp_submissions')
    .select('speaker_id')
    .eq('status', 'accepted');

  const acceptedIds = new Set((acceptedSubmissions || []).map((s: { speaker_id: string }) => s.speaker_id));

  // Get admin-managed, featured, or visible speakers (invited speakers)
  const { data: programSpeakers } = await supabase
    .from('cfp_speakers')
    .select('id')
    .or('is_admin_managed.eq.true,is_featured.eq.true,is_visible.eq.true');

  const programIds = (programSpeakers || []).map((s: { id: string }) => s.id);

  // Merge both sets
  programIds.forEach((id: string) => acceptedIds.add(id));

  return [...acceptedIds];
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

  const uniqueSpeakerIds = await getProgramSpeakerIds();

  // Get travel stats
  const { data: travelData } = await supabase
    .from('cfp_speaker_travel')
    .select('*')
    .in('speaker_id', uniqueSpeakerIds);

  const travelConfirmed = (travelData || []).filter((t: CfpSpeakerTravel) => t.travel_confirmed).length;
  const attendingDinner = (travelData || []).filter((t: CfpSpeakerTravel) => t.attending_speakers_dinner).length;
  const attendingActivities = (travelData || []).filter((t: CfpSpeakerTravel) => t.attending_speakers_activities).length;

  // Get pending invoices (scoped to program speakers)
  const { data: pendingInvoices } = await supabase
    .from('cfp_speaker_reimbursements')
    .select('amount, currency')
    .in('speaker_id', uniqueSpeakerIds)
    .eq('status', 'pending');

  const pendingCount = (pendingInvoices || []).length;
  const totalPendingAmounts: Record<string, number> = {};
  (pendingInvoices || []).forEach((r: { amount: number; currency: string }) => {
    const cur = r.currency || 'CHF';
    totalPendingAmounts[cur] = (totalPendingAmounts[cur] || 0) + r.amount;
  });

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

  // Get accommodation stats
  const { data: accommodationData } = await supabase
    .from('cfp_speaker_accommodation')
    .select('speaker_id, hotel_name, check_in_date, check_out_date')
    .in('speaker_id', uniqueSpeakerIds);

  type AccommodationRecord = { speaker_id: string; hotel_name: string | null; check_in_date: string | null; check_out_date: string | null };
  const bookedAccommodations = (accommodationData || []).filter((a: AccommodationRecord) => a.hotel_name);
  const hotelsBooked = bookedAccommodations.length;
  const hotelsPending = uniqueSpeakerIds.length - hotelsBooked;

  const totalHotelNights = bookedAccommodations.reduce((sum: number, a: AccommodationRecord) => {
    if (!a.check_in_date || !a.check_out_date) return sum;
    const nights = Math.round((new Date(a.check_out_date).getTime() - new Date(a.check_in_date).getTime()) / 86400000);
    return sum + Math.max(0, nights);
  }, 0);

  return {
    total_accepted_speakers: uniqueSpeakerIds.length,
    travel_confirmed: travelConfirmed,
    attending_dinner: attendingDinner,
    attending_activities: attendingActivities,
    pending_invoices: pendingCount,
    total_invoice_amounts: totalPendingAmounts,
    flights_arriving_today: arrivingToday,
    flights_departing_today: departingToday,
    hotels_booked: hotelsBooked,
    hotels_pending: hotelsPending,
    total_hotel_nights: totalHotelNights,
  };
}

// ============================================================================
// Speakers with Travel
// ============================================================================

/**
 * Get all program speakers (accepted + invited) with their travel details
 */
export async function getAcceptedSpeakersWithTravel(): Promise<SpeakerWithTravel[]> {
  const supabase = createCfpServiceClient();

  const speakerIds = await getProgramSpeakerIds();

  if (speakerIds.length === 0) {
    return [];
  }

  // Get speakers
  const { data: speakers } = await supabase
    .from('cfp_speakers')
    .select('*')
    .in('id', speakerIds)
    .order('last_name');

  if (!speakers || speakers.length === 0) {
    return [];
  }

  // Get accepted submission counts
  const { data: acceptedSubmissions } = await supabase
    .from('cfp_submissions')
    .select('speaker_id')
    .eq('status', 'accepted')
    .in('speaker_id', speakerIds);

  // Get all travel data in parallel
  const [travelResult, flightsResult, accommodationResult, reimbursementsResult] = await Promise.all([
    supabase.from('cfp_speaker_travel').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_flights').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_accommodation').select('*').in('speaker_id', speakerIds),
    supabase.from('cfp_speaker_reimbursements').select('*').in('speaker_id', speakerIds),
  ]);

  // Count accepted submissions per speaker
  const submissionCounts: Record<string, number> = {};
  (acceptedSubmissions || []).forEach((s: { speaker_id: string }) => {
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
    attending_speakers_dinner?: boolean | null;
    attending_speakers_activities?: boolean | null;
    arrival_date?: string | null;
    departure_date?: string | null;
    dietary_restrictions?: string | null;
    accessibility_needs?: string | null;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const payload: Record<string, unknown> = {
    speaker_id: speakerId,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.travel_confirmed === true) {
    payload.confirmed_at = new Date().toISOString();
  } else if (updates.travel_confirmed === false) {
    payload.confirmed_at = null;
  }

  const { error } = await supabase
    .from('cfp_speaker_travel')
    .upsert(payload, { onConflict: 'speaker_id' });

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

  const speakerIds = await getProgramSpeakerIds();

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


/**
 * Create a flight for a speaker (admin).
 * New flights default to 'confirmed' — admins don't manually track
 * boarding/departed/arrived states; live status is shown via the
 * Flightradar24 deep link in the UI.
 */
export async function createFlightAdmin(
  speakerId: string,
  data: {
    direction: CfpFlightDirection;
    airline?: string;
    flight_number?: string;
    departure_airport?: string;
    arrival_airport?: string;
    departure_time?: string;
    arrival_time?: string;
    booking_reference?: string;
    cost_amount?: number;
    cost_currency?: string;
    tracking_url?: string;
    flight_status?: CfpFlightStatus;
  }
): Promise<{ flight: CfpSpeakerFlight | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data: flight, error } = await supabase
    .from('cfp_speaker_flights')
    .insert({
      speaker_id: speakerId,
      direction: data.direction,
      airline: data.airline || null,
      flight_number: data.flight_number || null,
      departure_airport: data.departure_airport || null,
      arrival_airport: data.arrival_airport || null,
      departure_time: data.departure_time || null,
      arrival_time: data.arrival_time || null,
      booking_reference: data.booking_reference || null,
      cost_amount: data.cost_amount ?? null,
      cost_currency: data.cost_currency || 'CHF',
      tracking_url: data.tracking_url || null,
      flight_status: data.flight_status || 'confirmed',
    })
    .select()
    .single();

  if (error) {
    console.error('[Admin Travel] Create flight error:', error);
    return { flight: null, error: 'Failed to create flight' };
  }

  return { flight: flight as CfpSpeakerFlight, error: null };
}

/**
 * Update a flight (admin - no speaker_id constraint)
 */
export async function updateFlightAdmin(
  flightId: string,
  updates: {
    direction?: CfpFlightDirection;
    airline?: string;
    flight_number?: string;
    departure_airport?: string;
    arrival_airport?: string;
    departure_time?: string;
    arrival_time?: string;
    booking_reference?: string;
    cost_amount?: number;
    cost_currency?: string;
    tracking_url?: string;
    flight_status?: CfpFlightStatus;
  }
): Promise<{ flight: CfpSpeakerFlight | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data: flight, error } = await supabase
    .from('cfp_speaker_flights')
    .update({
      ...updates,
      last_status_update: updates.flight_status ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', flightId)
    .select()
    .single();

  if (error) {
    console.error('[Admin Travel] Update flight error:', error);
    return { flight: null, error: 'Failed to update flight' };
  }

  return { flight: flight as CfpSpeakerFlight, error: null };
}

/**
 * Delete a flight (admin)
 */
export async function deleteFlightAdmin(
  flightId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_flights')
    .delete()
    .eq('id', flightId);

  if (error) {
    console.error('[Admin Travel] Delete flight error:', error);
    return { success: false, error: 'Failed to delete flight' };
  }

  return { success: true, error: null };
}

// ============================================================================
// Invoice Management (uses cfp_speaker_reimbursements table)
// ============================================================================

/**
 * Get all invoices with speaker info
 */
export async function getAllInvoices(options?: {
  status?: CfpReimbursementStatus;
}): Promise<InvoiceWithSpeaker[]> {
  const supabase = createCfpServiceClient();

  let query = supabase
    .from('cfp_speaker_reimbursements')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data: invoices } = await query;

  if (!invoices || invoices.length === 0) {
    return [];
  }

  type InvoiceRecord = { speaker_id: string; [key: string]: unknown };
  type SpeakerInfo = { id: string; first_name: string; last_name: string; email: string };
  const speakerIds = [...new Set(invoices.map((r: InvoiceRecord) => r.speaker_id))];
  const { data: speakers } = await supabase
    .from('cfp_speakers')
    .select('id, first_name, last_name, email')
    .in('id', speakerIds);

  const speakerMap = new Map((speakers || []).map((s: SpeakerInfo) => [s.id, s]));

  return invoices.map((invoice: InvoiceRecord) => ({
    ...invoice,
    speaker: speakerMap.get(invoice.speaker_id) || {
      id: invoice.speaker_id,
      first_name: 'Unknown',
      last_name: 'Speaker',
      email: '',
    },
  })) as InvoiceWithSpeaker[];
}

/**
 * Create an invoice for a speaker (admin)
 */
export async function createInvoiceAdmin(
  speakerId: string,
  data: {
    expense_type: CfpReimbursementType;
    description: string;
    amount: number;
    currency?: string;
    admin_notes?: string;
    invoice_number?: string;
    invoice_date?: string;
  }
): Promise<{ invoice: CfpSpeakerReimbursement | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const metadata: Record<string, unknown> = {};
  if (data.invoice_number) metadata.invoice_number = data.invoice_number;
  if (data.invoice_date) metadata.invoice_date = data.invoice_date;

  const { data: invoice, error } = await supabase
    .from('cfp_speaker_reimbursements')
    .insert({
      speaker_id: speakerId,
      expense_type: data.expense_type,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'CHF',
      admin_notes: data.admin_notes || null,
      status: 'pending',
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('[Admin Travel] Create invoice error:', error);
    return { invoice: null, error: 'Failed to create invoice' };
  }

  return { invoice: invoice as CfpSpeakerReimbursement, error: null };
}

/**
 * Update an invoice (admin)
 */
export async function updateInvoiceAdmin(
  invoiceId: string,
  updates: {
    expense_type?: CfpReimbursementType;
    description?: string;
    amount?: number;
    currency?: string;
    admin_notes?: string;
    status?: CfpReimbursementStatus;
    invoice_number?: string;
    invoice_date?: string;
  }
): Promise<{ invoice: CfpSpeakerReimbursement | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  // Build metadata updates
  const { invoice_number, invoice_date, ...dbUpdates } = updates;
  const updatePayload: Record<string, unknown> = {
    ...dbUpdates,
    updated_at: new Date().toISOString(),
  };

  if (updates.status === 'approved' || updates.status === 'rejected') {
    updatePayload.reviewed_at = new Date().toISOString();
  }
  if (updates.status === 'paid') {
    updatePayload.paid_at = new Date().toISOString();
  }

  // Handle metadata fields
  if (invoice_number !== undefined || invoice_date !== undefined) {
    // Fetch current metadata first
    const { data: current } = await supabase
      .from('cfp_speaker_reimbursements')
      .select('metadata')
      .eq('id', invoiceId)
      .single();

    const currentMetadata = (current?.metadata as Record<string, unknown>) || {};
    if (invoice_number !== undefined) currentMetadata.invoice_number = invoice_number;
    if (invoice_date !== undefined) currentMetadata.invoice_date = invoice_date;
    updatePayload.metadata = currentMetadata;
  }

  const { data: invoice, error } = await supabase
    .from('cfp_speaker_reimbursements')
    .update(updatePayload)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('[Admin Travel] Update invoice error:', error);
    return { invoice: null, error: 'Failed to update invoice' };
  }

  return { invoice: invoice as CfpSpeakerReimbursement, error: null };
}

/**
 * Delete an invoice (admin) - also removes uploaded PDF from storage
 */
export async function deleteInvoiceAdmin(
  invoiceId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  // Fetch receipt_url to clean up storage
  const { data: invoice } = await supabase
    .from('cfp_speaker_reimbursements')
    .select('receipt_url')
    .eq('id', invoiceId)
    .single();

  // Delete the PDF from storage if it exists
  if (invoice?.receipt_url) {
    const match = invoice.receipt_url.match(/travel-invoices\/(.+)$/);
    if (match) {
      await supabase.storage.from('travel-invoices').remove([match[1]]);
    }
  }

  const { error } = await supabase
    .from('cfp_speaker_reimbursements')
    .delete()
    .eq('id', invoiceId);

  if (error) {
    console.error('[Admin Travel] Delete invoice error:', error);
    return { success: false, error: 'Failed to delete invoice' };
  }

  return { success: true, error: null };
}

/**
 * Update invoice PDF URL after file upload
 */
export async function updateInvoicePdfUrl(
  invoiceId: string,
  pdfUrl: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speaker_reimbursements')
    .update({
      receipt_url: pdfUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (error) {
    console.error('[Admin Travel] Update invoice PDF error:', error);
    return { success: false, error: 'Failed to update invoice PDF' };
  }

  return { success: true, error: null };
}

// Keep old function names for backward compatibility
export const getAllReimbursements = getAllInvoices;
export async function updateReimbursementStatus(
  reimbursementId: string,
  _reviewerId: string,
  status: CfpReimbursementStatus,
  adminNotes?: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await updateInvoiceAdmin(reimbursementId, { status, admin_notes: adminNotes });
  return { success: !result.error, error: result.error };
}
