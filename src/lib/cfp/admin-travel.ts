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
  accommodation_bookings: AccommodationBookingWithContext[];
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
  accommodation_people: number;
  accommodation_rooms: number;
  accommodation_confirmed: number;
  accommodation_pending: number;
  accommodation_guest_payments_due: number;
}

export interface FlightWithSpeaker extends CfpSpeakerFlight {
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
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

export type AccommodationBookingStatus = 'draft' | 'pending_details' | 'pending_payment' | 'confirmed' | 'canceled';

export interface HotelRoomType {
  id: string;
  hotel_id: string;
  name: string;
  default_nightly_rate: number | null;
  default_occupancy: number | null;
  max_occupancy: number | null;
  notes: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Hotel {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  room_types: HotelRoomType[];
  created_at: string;
  updated_at: string;
}

export interface AccommodationBookingRoom {
  id: string;
  booking_id: string;
  hotel_id: string;
  room_type_id: string | null;
  room_name: string;
  people_count: number;
  check_in_date: string | null;
  check_out_date: string | null;
  nightly_rate: number;
  metadata: Record<string, unknown>;
  hotel: Hotel | null;
  room_type: HotelRoomType | null;
  created_at: string;
  updated_at: string;
}

export interface AccommodationBooking {
  id: string;
  booking_group_id: string;
  related_speaker_id: string | null;
  guest_name: string;
  guest_email: string | null;
  status: AccommodationBookingStatus;
  reservation_number: string | null;
  reservation_confirmation_url: string | null;
  conference_amount: number;
  guest_amount: number;
  admin_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AccommodationBookingWithContext extends AccommodationBooking {
  rooms: AccommodationBookingRoom[];
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  next_outbound_flight: CfpSpeakerFlight | null;
}

export interface AccommodationRoomInput {
  hotel_id?: string | null;
  hotel_name?: string | null;
  hotel_address?: string | null;
  room_type_id?: string | null;
  room_type_name?: string | null;
  save_room_type?: boolean;
  people_count: number;
  check_in_date?: string | null;
  check_out_date?: string | null;
  nightly_rate: number;
}

export interface AccommodationBookingInput {
  related_speaker_id?: string | null;
  guest_name: string;
  guest_email?: string | null;
  status: AccommodationBookingStatus;
  reservation_number?: string | null;
  reservation_confirmation_url?: string | null;
  conference_amount: number;
  guest_amount: number;
  admin_notes?: string | null;
  metadata?: Record<string, unknown>;
  rooms: AccommodationRoomInput[];
}

export interface AccommodationsPayload {
  bookings: AccommodationBookingWithContext[];
  hotels: Hotel[];
}

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
 * Get travel dashboard statistics.
 *
 * "Travel confirmed" is derived: a speaker counts as confirmed when they
 * have BOTH an inbound and an outbound flight booked. The cfp_speaker_travel
 * .travel_confirmed boolean column is no longer the source of truth — admins
 * never had to flip it manually for the count to be useful.
 */
export async function getTravelDashboardStats(): Promise<TravelDashboardStats> {
  const supabase = createCfpServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const uniqueSpeakerIds = await getProgramSpeakerIds();

  // Get travel preferences (dinner / activities only — confirmation is derived)
  const { data: travelData } = await supabase
    .from('cfp_speaker_travel')
    .select('*')
    .in('speaker_id', uniqueSpeakerIds);

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

  // Pull all in-scope flights once — used for arriving/departing today AND
  // for the derived travel_confirmed count.
  type FlightRow = { speaker_id: string; direction: string; arrival_time: string | null; departure_time: string | null };
  const { data: scopedFlights } = await supabase
    .from('cfp_speaker_flights')
    .select('speaker_id, direction, arrival_time, departure_time')
    .in('speaker_id', uniqueSpeakerIds);

  const flightsList: FlightRow[] = (scopedFlights || []) as FlightRow[];

  const arrivingToday = flightsList.filter((f) =>
    f.direction === 'inbound' && !!f.arrival_time && f.arrival_time.startsWith(today)
  ).length;

  const departingToday = flightsList.filter((f) =>
    f.direction === 'outbound' && !!f.departure_time && f.departure_time.startsWith(today)
  ).length;

  // travel_confirmed = speaker has at least one inbound AND one outbound flight
  const directionsBySpeaker = new Map<string, Set<string>>();
  flightsList.forEach((f) => {
    let dirs = directionsBySpeaker.get(f.speaker_id);
    if (!dirs) {
      dirs = new Set<string>();
      directionsBySpeaker.set(f.speaker_id, dirs);
    }
    dirs.add(f.direction);
  });
  const travelConfirmed = [...directionsBySpeaker.values()]
    .filter((dirs) => dirs.has('inbound') && dirs.has('outbound')).length;

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

  const [bookingStatsResult, roomStatsResult] = await Promise.all([
    supabase
      .from('accommodation_bookings')
      .select('status, guest_amount'),
    supabase
      .from('accommodation_booking_rooms')
      .select('people_count, accommodation_bookings!inner(status)'),
  ]);

  type GeneralAccommodationBookingStats = {
    status: AccommodationBookingStatus | null;
    guest_amount: number | null;
  };
  type GeneralAccommodationRoomStats = {
    people_count: number | null;
    accommodation_bookings?: { status: AccommodationBookingStatus | null } | { status: AccommodationBookingStatus | null }[] | null;
  };
  const accommodationBookings = (bookingStatsResult.data || []) as GeneralAccommodationBookingStats[];
  const accommodationRoomStats = (roomStatsResult.data || []) as unknown as GeneralAccommodationRoomStats[];
  const activeAccommodationRooms = accommodationRoomStats.filter((a) => {
    const booking = Array.isArray(a.accommodation_bookings) ? a.accommodation_bookings[0] : a.accommodation_bookings;
    return booking?.status !== 'canceled';
  });
  const accommodationRooms = activeAccommodationRooms.length;
  const accommodationPeople = activeAccommodationRooms.reduce((sum, a) => sum + (a.people_count ?? 0), 0);
  const accommodationConfirmed = accommodationBookings.filter((a) => a.status === 'confirmed').length;
  const accommodationPending = accommodationBookings.filter((a) =>
    a.status === 'draft' || a.status === 'pending_details' || a.status === 'pending_payment'
  ).length;
  const accommodationGuestPaymentsDue = accommodationBookings.reduce((sum, a) => {
    if (a.status === 'canceled') return sum;
    return sum + (a.guest_amount ?? 0);
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
    accommodation_people: accommodationPeople,
    accommodation_rooms: accommodationRooms,
    accommodation_confirmed: accommodationConfirmed,
    accommodation_pending: accommodationPending,
    accommodation_guest_payments_due: accommodationGuestPaymentsDue,
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

  const generalAccommodations = await getAccommodations();
  const bookingsBySpeaker = new Map<string, AccommodationBookingWithContext[]>();
  generalAccommodations.bookings.forEach((booking) => {
    if (!booking.related_speaker_id) return;
    const items = bookingsBySpeaker.get(booking.related_speaker_id) ?? [];
    items.push(booking);
    bookingsBySpeaker.set(booking.related_speaker_id, items);
  });

  // Combine data
  return speakers.map((speaker: CfpSpeaker) => ({
    ...speaker,
    travel: (travelResult.data || []).find((t: DbRecord) => t.speaker_id === speaker.id) || null,
    flights: (flightsResult.data || []).filter((f: DbRecord) => f.speaker_id === speaker.id),
    accommodation: (accommodationResult.data || []).find((a: DbRecord) => a.speaker_id === speaker.id) || null,
    accommodation_bookings: bookingsBySpeaker.get(speaker.id) ?? [],
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

  const generalAccommodations = await getAccommodations();

  return {
    ...speaker,
    travel: travelResult.data || null,
    flights: flightsResult.data || [],
    accommodation: accommodationResult.data || null,
    accommodation_bookings: generalAccommodations.bookings.filter((booking) => booking.related_speaker_id === speakerId),
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
// Generic Accommodation Management
// ============================================================================

function metadata(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function normalizeRoomType(row: Record<string, unknown>): HotelRoomType {
  return {
    id: String(row.id),
    hotel_id: String(row.hotel_id),
    name: String(row.name ?? ''),
    default_nightly_rate: typeof row.default_nightly_rate === 'number' ? row.default_nightly_rate : null,
    default_occupancy: typeof row.default_occupancy === 'number' ? row.default_occupancy : null,
    max_occupancy: typeof row.max_occupancy === 'number' ? row.max_occupancy : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    is_active: row.is_active !== false,
    metadata: metadata(row.metadata),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function normalizeHotel(row: Record<string, unknown>, roomTypes: HotelRoomType[] = []): Hotel {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    address: typeof row.address === 'string' ? row.address : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    is_active: row.is_active !== false,
    metadata: metadata(row.metadata),
    room_types: roomTypes,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function normalizeBooking(row: Record<string, unknown>): AccommodationBooking {
  return {
    id: String(row.id),
    booking_group_id: String(row.booking_group_id ?? row.id ?? ''),
    related_speaker_id: typeof row.related_speaker_id === 'string' ? row.related_speaker_id : null,
    guest_name: String(row.guest_name ?? ''),
    guest_email: typeof row.guest_email === 'string' ? row.guest_email : null,
    status: (row.status as AccommodationBookingStatus) ?? 'draft',
    reservation_number: typeof row.reservation_number === 'string' ? row.reservation_number : null,
    reservation_confirmation_url: typeof row.reservation_confirmation_url === 'string' ? row.reservation_confirmation_url : null,
    conference_amount: typeof row.conference_amount === 'number' ? row.conference_amount : 0,
    guest_amount: typeof row.guest_amount === 'number' ? row.guest_amount : 0,
    admin_notes: typeof row.admin_notes === 'string' ? row.admin_notes : null,
    metadata: metadata(row.metadata),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function normalizeBookingRoom(
  row: Record<string, unknown>,
  hotels: Map<string, Hotel>,
  roomTypes: Map<string, HotelRoomType>
): AccommodationBookingRoom {
  const roomTypeId = typeof row.room_type_id === 'string' ? row.room_type_id : null;
  const hotelId = String(row.hotel_id);
  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    hotel_id: hotelId,
    room_type_id: roomTypeId,
    room_name: String(row.room_name ?? ''),
    people_count: typeof row.people_count === 'number' ? row.people_count : 1,
    check_in_date: typeof row.check_in_date === 'string' ? row.check_in_date : null,
    check_out_date: typeof row.check_out_date === 'string' ? row.check_out_date : null,
    nightly_rate: typeof row.nightly_rate === 'number' ? row.nightly_rate : 0,
    metadata: metadata(row.metadata),
    hotel: hotels.get(hotelId) ?? null,
    room_type: roomTypeId ? roomTypes.get(roomTypeId) ?? null : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

async function getHotels(): Promise<Hotel[]> {
  const supabase = createCfpServiceClient();
  const [hotelsResult, roomTypesResult] = await Promise.all([
    supabase.from('hotels').select('*').order('name'),
    supabase.from('hotel_room_types').select('*').order('name'),
  ]);

  const roomTypes = ((roomTypesResult.data || []) as Record<string, unknown>[]).map(normalizeRoomType);
  const roomTypesByHotel = new Map<string, HotelRoomType[]>();
  roomTypes.forEach((roomType) => {
    const items = roomTypesByHotel.get(roomType.hotel_id) ?? [];
    items.push(roomType);
    roomTypesByHotel.set(roomType.hotel_id, items);
  });

  return ((hotelsResult.data || []) as Record<string, unknown>[])
    .map((hotel) => normalizeHotel(hotel, roomTypesByHotel.get(String(hotel.id)) ?? []));
}

async function resolveRoomCatalog(room: AccommodationRoomInput): Promise<{
  hotelId: string;
  roomTypeId: string | null;
  roomName: string;
  nightlyRate: number;
  error: string | null;
}> {
  const supabase = createCfpServiceClient();
  let hotelId = room.hotel_id || null;

  if (!hotelId) {
    if (!room.hotel_name?.trim()) {
      return { hotelId: '', roomTypeId: null, roomName: '', nightlyRate: 0, error: 'Hotel is required for each room' };
    }

    const { data: hotel, error } = await supabase
      .from('hotels')
      .insert({
        name: room.hotel_name.trim(),
        address: room.hotel_address?.trim() || null,
      })
      .select()
      .single();

    if (error || !hotel) {
      return { hotelId: '', roomTypeId: null, roomName: '', nightlyRate: 0, error: 'Failed to create hotel' };
    }
    hotelId = String(hotel.id);
  }

  let roomTypeId = room.room_type_id || null;
  let roomName = room.room_type_name?.trim() || 'Room';
  let nightlyRate = Math.max(0, room.nightly_rate);

  if (roomTypeId) {
    const { data: roomType } = await supabase
      .from('hotel_room_types')
      .select('*')
      .eq('id', roomTypeId)
      .single();

    if (roomType) {
      roomName = String(roomType.name ?? roomName);
      if (nightlyRate === 0 && typeof roomType.default_nightly_rate === 'number') {
        nightlyRate = roomType.default_nightly_rate;
      }
    }
  } else if (room.save_room_type && roomName.trim()) {
    const { data: roomType, error } = await supabase
      .from('hotel_room_types')
      .insert({
        hotel_id: hotelId,
        name: roomName,
        default_nightly_rate: nightlyRate,
        default_occupancy: room.people_count,
        max_occupancy: room.people_count,
      })
      .select()
      .single();

    if (error || !roomType) {
      return { hotelId: '', roomTypeId: null, roomName: '', nightlyRate: 0, error: 'Failed to create room type' };
    }
    roomTypeId = String(roomType.id);
  }

  return { hotelId, roomTypeId, roomName, nightlyRate, error: null };
}

async function insertBookingRooms(bookingId: string, rooms: AccommodationRoomInput[]): Promise<string | null> {
  const supabase = createCfpServiceClient();
  const rows = [];

  for (const room of rooms) {
    const catalog = await resolveRoomCatalog(room);
    if (catalog.error) return catalog.error;
    rows.push({
      booking_id: bookingId,
      hotel_id: catalog.hotelId,
      room_type_id: catalog.roomTypeId,
      room_name: catalog.roomName,
      people_count: Math.max(1, room.people_count),
      check_in_date: room.check_in_date || null,
      check_out_date: room.check_out_date || null,
      nightly_rate: catalog.nightlyRate,
    });
  }

  const { error } = await supabase.from('accommodation_booking_rooms').insert(rows);
  return error ? 'Failed to save room lines' : null;
}

export async function getAccommodations(): Promise<AccommodationsPayload> {
  const supabase = createCfpServiceClient();
  const hotels = await getHotels();
  const hotelMap = new Map(hotels.map((hotel) => [hotel.id, hotel]));
  const roomTypeMap = new Map(hotels.flatMap((hotel) => hotel.room_types.map((roomType) => [roomType.id, roomType] as const)));

  const { data: bookingRows } = await supabase
    .from('accommodation_bookings')
    .select('*')
    .order('created_at', { ascending: false });

  const bookings = ((bookingRows || []) as Record<string, unknown>[]).map(normalizeBooking);
  if (bookings.length === 0) {
    return { bookings: [], hotels };
  }

  const bookingIds = bookings.map((booking) => booking.id);
  const speakerIds = [...new Set(bookings.map((booking) => booking.related_speaker_id).filter((id): id is string => !!id))];

  const [roomsResult, speakersResult, flightsResult] = await Promise.all([
    supabase.from('accommodation_booking_rooms').select('*').in('booking_id', bookingIds),
    speakerIds.length > 0
      ? supabase.from('cfp_speakers').select('id, first_name, last_name, email').in('id', speakerIds)
      : Promise.resolve({ data: [] }),
    speakerIds.length > 0
      ? supabase.from('cfp_speaker_flights').select('*').in('speaker_id', speakerIds).eq('direction', 'outbound').order('departure_time', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  type SpeakerRecord = { id: string; first_name: string; last_name: string; email: string };
  const speakers = new Map(((speakersResult.data || []) as SpeakerRecord[]).map((speaker) => [speaker.id, speaker]));
  const flights = (flightsResult.data || []) as CfpSpeakerFlight[];
  const roomsByBooking = new Map<string, AccommodationBookingRoom[]>();
  ((roomsResult.data || []) as Record<string, unknown>[]).forEach((row) => {
    const room = normalizeBookingRoom(row, hotelMap, roomTypeMap);
    const items = roomsByBooking.get(room.booking_id) ?? [];
    items.push(room);
    roomsByBooking.set(room.booking_id, items);
  });

  return {
    hotels,
    bookings: bookings.map((booking) => {
      const rooms = roomsByBooking.get(booking.id) ?? [];
      const sortedCheckOuts = rooms.map((room) => room.check_out_date).filter(Boolean).sort();
      const lastCheckOut = sortedCheckOuts[sortedCheckOuts.length - 1] ?? null;
      const speakerFlights = booking.related_speaker_id
        ? flights.filter((flight) => flight.speaker_id === booking.related_speaker_id)
        : [];
      const nextOutboundFlight = speakerFlights.find((flight) =>
        !lastCheckOut || !flight.departure_time || flight.departure_time.slice(0, 10) >= lastCheckOut
      ) ?? speakerFlights[0] ?? null;

      return {
        ...booking,
        rooms,
        speaker: booking.related_speaker_id ? speakers.get(booking.related_speaker_id) ?? null : null,
        next_outbound_flight: nextOutboundFlight,
      };
    }),
  };
}

export async function createAccommodationAdmin(
  input: AccommodationBookingInput
): Promise<{ booking: AccommodationBooking | null; error: string | null }> {
  const supabase = createCfpServiceClient();
  const { rooms, ...bookingInput } = input;

  const { data, error } = await supabase
    .from('accommodation_bookings')
    .insert({
      ...bookingInput,
      related_speaker_id: bookingInput.related_speaker_id || null,
      guest_email: bookingInput.guest_email || null,
      reservation_number: bookingInput.reservation_number || null,
      reservation_confirmation_url: bookingInput.reservation_confirmation_url || null,
      admin_notes: bookingInput.admin_notes || null,
      metadata: bookingInput.metadata ?? {},
    })
    .select()
    .single();

  if (error || !data) {
    return { booking: null, error: 'Failed to create accommodation booking' };
  }

  const roomError = await insertBookingRooms(String(data.id), rooms);
  if (roomError) {
    await supabase.from('accommodation_bookings').delete().eq('id', String(data.id));
    return { booking: null, error: roomError };
  }

  return { booking: normalizeBooking(data as Record<string, unknown>), error: null };
}

export async function updateAccommodationAdmin(
  id: string,
  input: AccommodationBookingInput
): Promise<{ booking: AccommodationBooking | null; error: string | null }> {
  const supabase = createCfpServiceClient();
  const { rooms, ...bookingInput } = input;

  const { data, error } = await supabase
    .from('accommodation_bookings')
    .update({
      ...bookingInput,
      related_speaker_id: bookingInput.related_speaker_id || null,
      guest_email: bookingInput.guest_email || null,
      reservation_number: bookingInput.reservation_number || null,
      reservation_confirmation_url: bookingInput.reservation_confirmation_url || null,
      admin_notes: bookingInput.admin_notes || null,
      metadata: bookingInput.metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return { booking: null, error: 'Failed to update accommodation booking' };
  }

  const { error: deleteRoomsError } = await supabase
    .from('accommodation_booking_rooms')
    .delete()
    .eq('booking_id', id);

  if (deleteRoomsError) {
    return { booking: null, error: 'Failed to replace room lines' };
  }

  const roomError = await insertBookingRooms(id, rooms);
  if (roomError) {
    return { booking: null, error: roomError };
  }

  return { booking: normalizeBooking(data as Record<string, unknown>), error: null };
}

export async function deleteAccommodationAdmin(id: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('accommodation_bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Failed to delete accommodation booking' };
  }

  return { success: true, error: null };
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

  // Build flights query
  let query = supabase
    .from('cfp_speaker_flights')
    .select('*');

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
  type FlightRecord = { speaker_id: string | null; [key: string]: unknown };
  type SpeakerRecord = { id: string; first_name: string; last_name: string; email: string };
  const flightSpeakerIds = [...new Set(flights.map((f: FlightRecord) => f.speaker_id).filter((id): id is string => !!id))];
  const { data: speakers } = flightSpeakerIds.length > 0
    ? await supabase
      .from('cfp_speakers')
      .select('id, first_name, last_name, email')
      .in('id', flightSpeakerIds)
    : { data: [] };

  const speakerMap = new Map((speakers || []).map((s: SpeakerRecord) => [s.id, s]));

  return flights.map((flight: FlightRecord) => ({
    ...flight,
    speaker: flight.speaker_id ? speakerMap.get(flight.speaker_id) ?? null : null,
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
  speakerId: string | null,
  data: {
    traveler_name?: string;
    traveler_email?: string;
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
      traveler_name: data.traveler_name || null,
      traveler_email: data.traveler_email || null,
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
    speaker_id?: string | null;
    traveler_name?: string | null;
    traveler_email?: string | null;
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
