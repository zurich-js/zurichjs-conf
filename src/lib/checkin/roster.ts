/**
 * The roster the door station prefetches once per shift.
 *
 * Everything here exists to make the SCAN path free. A station holds this in
 * memory, resolves a scanned UUID from a map across both id spaces, and makes no
 * network request to read. The alternative — a lookup per scan — costs three
 * round trips per attendee and is what the current flow does.
 *
 * PROJECTION IS THE PRIVACY BOUNDARY
 * Every query names its columns. A `select('*')` here would put every attendee's
 * Stripe customer, session and payment-intent ids, billing amounts and metadata
 * onto a volunteer's personal phone — measured at 1132 KB raw versus 249 KB for
 * this projection, and `tickets.metadata` alone is 29% of the difference. Hiding
 * a field in the UI would not help: the payload is what leaves the server.
 *
 * The four queries run concurrently because they are independent, and they are
 * separate keys on the client so a workshop sale can invalidate seats without
 * discarding the roster.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { DoorOccasion } from '@/lib/types/checkin';

const log = logger.scope('Door Roster');

/**
 * Rows are fetched in pages because PostgREST caps a response at max_rows
 * (1000 in supabase/config.toml). Past that cap the result is SILENTLY
 * truncated — attendees would simply be un-findable at the door with no error,
 * which is the worst possible failure mode. Mirrors fetchAllRows in
 * src/lib/cfp/admin.ts.
 */
const PAGE_SIZE = 500;

export interface RosterTicket {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  company: string | null;
  ticketType: string;
  ticketCategory: string;
  status: string;
  isVip: boolean;
  checkedInWorkshopDayAt: string | null;
  checkedInConferenceDayAt: string | null;
  goodieHandedAt: string | null;
  goodieNote: string | null;
  doorNote: string | null;
  tshirtSize: string | null;
  hoodieSize: string | null;
}

export interface RosterRegistration {
  id: string;
  workshopId: string;
  ticketId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  seatIndex: number;
  checkedInAt: string | null;
}

export interface RosterWorkshop {
  id: string;
  title: string;
  room: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
}

export interface DoorRoster {
  occasion: DoorOccasion;
  tickets: RosterTicket[];
  registrations: RosterRegistration[];
  workshops: RosterWorkshop[];
  /** Server time the roster was built, so a station can show how stale it is. */
  generatedAt: string;
}

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);

    if (error) {
      log.error(`Failed to page ${label}`, error);
      throw new Error(error.message);
    }
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

interface TicketRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company: string | null;
  ticket_type: string;
  ticket_category: string;
  status: string;
  checked_in_workshop_day_at: string | null;
  checked_in_conference_day_at: string | null;
  goodie_handed_at: string | null;
  goodie_note: string | null;
  door_note: string | null;
}

interface ApparelRow {
  ticket_id: string;
  tshirt_size: string | null;
  hoodie_size: string | null;
}

interface RegistrationRow {
  id: string;
  workshop_id: string;
  ticket_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  seat_index: number;
  checked_in_at: string | null;
}

interface WorkshopRow {
  id: string;
  title: string;
  room: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
}

/**
 * Build the roster for an occasion.
 *
 * Refused subjects are INCLUDED. A refunded ticket must resolve at the door and
 * be shown as refused with a reason — omitting it makes it indistinguishable
 * from a stranger's code, and the remedy for "not in roster" is to issue a
 * ticket, which would hand a free one to a charged-back attendee.
 */
export async function buildDoorRoster(occasion: DoorOccasion): Promise<DoorRoster> {
  const supabase = createServiceRoleClient();

  const [tickets, apparel, registrations, workshops] = await Promise.all([
    fetchAllPages<TicketRow>(
      (from, to) =>
        supabase
          .from('tickets')
          .select(
            'id, first_name, last_name, email, company, ticket_type, ticket_category, status, checked_in_workshop_day_at, checked_in_conference_day_at, goodie_handed_at, goodie_note, door_note'
          )
          .order('created_at', { ascending: true })
          .range(from, to),
      'tickets'
    ),
    fetchAllPages<ApparelRow>(
      (from, to) =>
        supabase
          .from('ticket_apparel_preferences')
          .select('ticket_id, tshirt_size, hoodie_size')
          .order('ticket_id', { ascending: true })
          .range(from, to),
      'apparel'
    ),
    fetchAllPages<RegistrationRow>(
      (from, to) =>
        supabase
          .from('workshop_registrations')
          .select(
            'id, workshop_id, ticket_id, first_name, last_name, email, company, seat_index, checked_in_at'
          )
          .order('created_at', { ascending: true })
          .range(from, to),
      'workshop_registrations'
    ),
    fetchAllPages<WorkshopRow>(
      (from, to) =>
        supabase
          .from('workshops')
          .select('id, title, room, date, start_time, end_time')
          .order('start_time', { ascending: true, nullsFirst: false })
          .range(from, to),
      'workshops'
    ),
  ]);

  const apparelByTicket = new Map(apparel.map((a) => [a.ticket_id, a]));

  return {
    occasion,
    generatedAt: new Date().toISOString(),
    tickets: tickets.map((t) => {
      const sizes = apparelByTicket.get(t.id);
      return {
        id: t.id,
        firstName: t.first_name,
        lastName: t.last_name,
        email: t.email,
        company: t.company,
        ticketType: t.ticket_type,
        ticketCategory: t.ticket_category,
        status: t.status,
        isVip: t.ticket_category === 'vip',
        checkedInWorkshopDayAt: t.checked_in_workshop_day_at,
        checkedInConferenceDayAt: t.checked_in_conference_day_at,
        goodieHandedAt: t.goodie_handed_at,
        goodieNote: t.goodie_note,
        doorNote: t.door_note,
        tshirtSize: sizes?.tshirt_size ?? null,
        hoodieSize: sizes?.hoodie_size ?? null,
      };
    }),
    registrations: registrations.map((r) => ({
      id: r.id,
      workshopId: r.workshop_id,
      ticketId: r.ticket_id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      company: r.company,
      seatIndex: r.seat_index,
      checkedInAt: r.checked_in_at,
    })),
    workshops: workshops.map((w) => ({
      id: w.id,
      title: w.title,
      room: w.room,
      date: w.date,
      startTime: w.start_time,
      endTime: w.end_time,
    })),
  };
}
