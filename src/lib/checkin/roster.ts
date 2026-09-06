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
 * (`amount_paid` and `metadata` ARE read here — for the hoodie verdict — but
 * only the boolean verdict is projected; the fields themselves stay server-side.)
 *
 * The four queries run concurrently because they are independent, and they are
 * separate keys on the client so a workshop sale can invalidate seats without
 * discarding the roster.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import { classifyTicketHoodie } from '@/lib/hoodies';
import { doorBadgePickups } from './rpc';
import type { Database } from '@/lib/types/database.generated';
import type { DoorOccasion, DoorTicketStatus } from '@/lib/types/checkin';
import type { HoodieExclusion, HoodieUpgradeInput } from '@/lib/types/hoodies';

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
  jobTitle: string | null;
  ticketType: string;
  ticketCategory: string;
  ticketStage: string;
  status: DoorTicketStatus;
  isVip: boolean;
  /**
   * Provenance for a transferred ticket. The door needs this: without it a
   * volunteer sees a badge naming someone else and has no way to tell a
   * legitimate transfer from a borrowed ticket.
   */
  transferredFromName: string | null;
  transferredFromEmail: string | null;
  checkedInWorkshopDayAt: string | null;
  checkedInConferenceDayAt: string | null;
  goodieHandedAt: string | null;
  goodieNote: string | null;
  /** When the t-shirt was physically handed over (null = not yet). */
  tshirtHandedAt: string | null;
  /** When the hoodie was physically handed over (null = not yet). */
  hoodieHandedAt: string | null;
  /**
   * Whether a hoodie is owed at all. Decided here, on the server, by the same
   * rules as the fulfilment allocation (src/lib/hoodies): a complimentary VIP
   * ticket or a free upgrade earns none, a speaker earns one on any ticket.
   * The inputs (payment metadata, upgrade records, the speaker list) never
   * leave the server — only the verdict does.
   */
  hoodieEligible: boolean;
  /** Why a VIP gets no hoodie, for the volunteer to explain. Null otherwise. */
  hoodieExclusion: HoodieExclusion | null;
  /** When the physical badge was handed over (early pickup included). */
  badgePickedUpAt: string | null;
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
  /** Set for workshop-only attendees who picked their badge up on their seat id. */
  badgePickedUpAt: string | null;
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
  job_title: string | null;
  ticket_type: string;
  ticket_category: string;
  ticket_stage: string;
  status: Database['public']['Enums']['payment_status'];
  transferred_from_name: string | null;
  transferred_from_email: string | null;
  checked_in_workshop_day_at: string | null;
  checked_in_conference_day_at: string | null;
  goodie_handed_at: string | null;
  goodie_note: string | null;
  tshirt_handed_at: string | null;
  hoodie_handed_at: string | null;
  door_note: string | null;
  /** Read server-side for the hoodie verdict only; never projected to the station. */
  amount_paid: number;
  metadata: unknown;
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

/** One metadata field, or null — tickets.metadata is untyped JSON. */
function readMetadataString(metadata: unknown, field: string): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const value = (metadata as Record<string, unknown>)[field];
  return typeof value === 'string' && value ? value : null;
}

/**
 * The two inputs the hoodie rule needs beyond the ticket row itself.
 *
 * Loaded best-effort: if either fails, the roster still ships and every VIP
 * reads as eligible (the pre-eligibility behaviour), because a door with no
 * roster is a far worse outcome than a hoodie handed to a comp VIP. The failure
 * is logged so it does not pass silently.
 */
async function loadHoodieInputs(
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<{ upgradesById: Map<string, HoodieUpgradeInput>; speakerEmails: Set<string> } | null> {
  try {
    const [speakers, upgrades] = await Promise.all([
      getAdminSpeakersWithSubmissions('program'),
      supabase
        .from('ticket_upgrades')
        .select('id, upgrade_mode, status, admin_note')
        .eq('to_tier', 'vip'),
    ]);
    if (upgrades.error) throw new Error(upgrades.error.message);
    return {
      upgradesById: new Map(
        ((upgrades.data ?? []) as HoodieUpgradeInput[]).map((upgrade) => [upgrade.id, upgrade])
      ),
      speakerEmails: new Set(speakers.map((speaker) => speaker.email.trim().toLowerCase())),
    };
  } catch (error) {
    log.error('Hoodie eligibility inputs unavailable; treating every VIP as eligible', error);
    return null;
  }
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

  const [tickets, apparel, registrations, workshops, badgePickups, hoodieInputs] = await Promise.all([
    fetchAllPages<TicketRow>(
      (from, to) =>
        supabase
          .from('tickets')
          .select(
            'id, first_name, last_name, email, company, job_title, ticket_type, ticket_category, ticket_stage, status, transferred_from_name, transferred_from_email, checked_in_workshop_day_at, checked_in_conference_day_at, goodie_handed_at, goodie_note, tshirt_handed_at, hoodie_handed_at, door_note, amount_paid, metadata'
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
    // Badge pickup state lives in door_events, not on the subject rows, so it
    // ships as one (subjectId, pickedUpAt) aggregate and is merged here.
    doorBadgePickups(),
    loadHoodieInputs(supabase),
  ]);

  const apparelByTicket = new Map(apparel.map((a) => [a.ticket_id, a]));
  const badgeBySubject = new Map(badgePickups.map((b) => [b.subjectId, b.pickedUpAt]));

  return {
    occasion,
    generatedAt: new Date().toISOString(),
    tickets: tickets.map((t) => {
      const sizes = apparelByTicket.get(t.id);
      const isVip = t.ticket_category === 'vip';
      const hoodie = hoodieInputs
        ? classifyTicketHoodie(
            {
              email: t.email,
              is_vip: isVip,
              amount_paid: t.amount_paid,
              payment_type: readMetadataString(t.metadata, 'paymentType'),
              complimentary_reason: readMetadataString(t.metadata, 'complimentaryReason'),
              upgrade_id: readMetadataString(t.metadata, 'upgrade_id'),
              upgraded_from: readMetadataString(t.metadata, 'upgraded_from'),
            },
            hoodieInputs.upgradesById,
            hoodieInputs.speakerEmails
          )
        : ({ eligible: isVip, exclusion: null } as const);
      return {
        id: t.id,
        firstName: t.first_name,
        lastName: t.last_name,
        email: t.email,
        company: t.company,
        jobTitle: t.job_title,
        ticketType: t.ticket_type,
        ticketCategory: t.ticket_category,
        ticketStage: t.ticket_stage,
        status: t.status,
        isVip,
        transferredFromName: t.transferred_from_name,
        transferredFromEmail: t.transferred_from_email,
        checkedInWorkshopDayAt: t.checked_in_workshop_day_at,
        checkedInConferenceDayAt: t.checked_in_conference_day_at,
        goodieHandedAt: t.goodie_handed_at,
        goodieNote: t.goodie_note,
        tshirtHandedAt: t.tshirt_handed_at,
        hoodieHandedAt: t.hoodie_handed_at,
        hoodieEligible: hoodie.eligible,
        hoodieExclusion: hoodie.eligible ? null : hoodie.exclusion,
        badgePickedUpAt: badgeBySubject.get(t.id) ?? null,
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
      badgePickedUpAt: badgeBySubject.get(r.id) ?? null,
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
