/**
 * After Party Roster
 * Pure functions that merge everyone expected at the VIP after party into a
 * single de-duplicated headcount:
 *   - program speakers who said yes in their logistics form
 *   - the plus ones those speakers declared (they get a VIP ticket issued)
 *   - additional guests admins added to the after-party activity
 *   - confirmed VIP ticket holders
 *
 * People are matched across sources by email so a plus one who already has
 * their VIP ticket issued (or a speaker who also bought a VIP ticket) counts
 * once.
 */

import { AFTER_PARTY_CAPACITY } from '@/config/after-party';

export const AFTER_PARTY_SOURCES = ['speaker', 'speaker_plus_one', 'activity_guest', 'vip_ticket'] as const;
export type AfterPartySource = (typeof AFTER_PARTY_SOURCES)[number];

export const AFTER_PARTY_SOURCE_LABELS: Record<AfterPartySource, string> = {
  speaker: 'Speaker',
  speaker_plus_one: 'Speaker plus one',
  activity_guest: 'Additional guest',
  vip_ticket: 'VIP ticket',
};

export interface AfterPartySpeakerInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  /** null when the speaker has not submitted their logistics form yet */
  attending_after_party: boolean | null;
  after_party_plus_one: boolean | null;
  after_party_plus_one_first_name: string | null;
  after_party_plus_one_last_name: string | null;
  after_party_plus_one_email: string | null;
  dietary_restrictions: string | null;
}

export interface AfterPartyGuestInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  guest_type: string;
  related_speaker_name: string | null;
  dietary_restrictions: string | null;
  admin_notes: string | null;
}

export interface AfterPartyTicketInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  amount_paid: number;
  /** metadata.paymentType === 'complimentary' for manually issued comps */
  payment_type: string | null;
  checked_in: boolean;
}

export interface AfterPartyTicketSummary {
  id: string;
  company: string | null;
  complimentary: boolean;
  checked_in: boolean;
}

export interface AfterPartyAttendee {
  /** Stable key — normalized email when available */
  key: string;
  first_name: string;
  last_name: string;
  email: string | null;
  /** How they got on the list, in priority order (first = primary) */
  sources: AfterPartySource[];
  primary_source: AfterPartySource;
  /** For plus ones: the speaker bringing them */
  related_speaker_name: string | null;
  /** For admin-added guests: volunteer / complimentary / paid / speaker_plus_one */
  guest_type: string | null;
  /** Confirmed VIP ticket held by this person, if any */
  ticket: AfterPartyTicketSummary | null;
  /** Speaker-declared plus one who has no VIP ticket issued yet */
  needs_vip_ticket: boolean;
  /** VIP ticket holder who is a speaker that declined the after party */
  speaker_declined: boolean;
  dietary_restrictions: string | null;
  notes: string | null;
}

export interface AfterPartyStats {
  capacity: number;
  /** Unique people expected */
  headcount: number;
  /** capacity - headcount; negative when over */
  remaining: number;
  over_capacity: boolean;
  over_by: number;
  /** Headcount by primary source — sums to headcount */
  by_source: Record<AfterPartySource, number>;
  /** All confirmed VIP tickets, including those merged into another source */
  vip_tickets_total: number;
  vip_tickets_complimentary: number;
  /** Speaker plus ones still waiting for their VIP ticket */
  plus_ones_needing_ticket: number;
  /** Program speakers who have not answered and are not on the list another way */
  speakers_unanswered: number;
  speakers_declined: number;
  /** headcount + unanswered speakers — the worst case if every pending speaker says yes */
  potential_headcount: number;
}

export interface AfterPartyRoster {
  attendees: AfterPartyAttendee[];
  stats: AfterPartyStats;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function attendeeKey(email: string | null | undefined, fallback: string): string {
  return normalizeEmail(email) ?? fallback;
}

function emptySourceCounts(): Record<AfterPartySource, number> {
  return { speaker: 0, speaker_plus_one: 0, activity_guest: 0, vip_ticket: 0 };
}

function isComplimentary(ticket: AfterPartyTicketInput): boolean {
  return ticket.payment_type === 'complimentary' || ticket.amount_paid === 0;
}

function toTicketSummary(ticket: AfterPartyTicketInput): AfterPartyTicketSummary {
  return {
    id: ticket.id,
    company: ticket.company,
    complimentary: isComplimentary(ticket),
    checked_in: ticket.checked_in,
  };
}

/**
 * Merge a person coming from one source into the roster. When the same email
 * is already listed, the new source is appended and any details the earlier
 * source lacked are filled in — the first source seen stays primary.
 */
function upsert(
  roster: Map<string, AfterPartyAttendee>,
  key: string,
  source: AfterPartySource,
  entry: Omit<AfterPartyAttendee, 'key' | 'sources' | 'primary_source'>
): AfterPartyAttendee {
  const existing = roster.get(key);
  if (!existing) {
    const attendee: AfterPartyAttendee = { key, sources: [source], primary_source: source, ...entry };
    roster.set(key, attendee);
    return attendee;
  }

  if (!existing.sources.includes(source)) existing.sources.push(source);
  existing.email ??= entry.email;
  existing.related_speaker_name ??= entry.related_speaker_name;
  existing.guest_type ??= entry.guest_type;
  existing.ticket ??= entry.ticket;
  existing.dietary_restrictions ??= entry.dietary_restrictions;
  existing.notes ??= entry.notes;
  existing.speaker_declined ||= entry.speaker_declined;
  return existing;
}

export function buildAfterPartyRoster(
  input: {
    speakers: AfterPartySpeakerInput[];
    guests: AfterPartyGuestInput[];
    tickets: AfterPartyTicketInput[];
  },
  capacity: number = AFTER_PARTY_CAPACITY
): AfterPartyRoster {
  const roster = new Map<string, AfterPartyAttendee>();
  const declinedSpeakerKeys = new Set<string>();
  const unansweredSpeakerKeys = new Set<string>();

  // 1. Speakers who said yes, plus the plus ones they declared
  for (const speaker of input.speakers) {
    const speakerKey = attendeeKey(speaker.email, `speaker:${speaker.id}`);
    const speakerName = `${speaker.first_name} ${speaker.last_name}`.trim();

    if (speaker.attending_after_party === true) {
      upsert(roster, speakerKey, 'speaker', {
        first_name: speaker.first_name,
        last_name: speaker.last_name,
        email: speaker.email,
        related_speaker_name: null,
        guest_type: null,
        ticket: null,
        needs_vip_ticket: false,
        speaker_declined: false,
        dietary_restrictions: speaker.dietary_restrictions,
        notes: null,
      });

      if (speaker.after_party_plus_one === true) {
        const plusOneKey = attendeeKey(speaker.after_party_plus_one_email, `plus_one:${speaker.id}`);
        upsert(roster, plusOneKey, 'speaker_plus_one', {
          first_name: speaker.after_party_plus_one_first_name?.trim() || 'Plus one',
          last_name: speaker.after_party_plus_one_last_name?.trim() || `of ${speakerName}`,
          email: normalizeEmail(speaker.after_party_plus_one_email),
          related_speaker_name: speakerName,
          guest_type: null,
          ticket: null,
          // Resolved once VIP tickets are merged in below
          needs_vip_ticket: true,
          speaker_declined: false,
          dietary_restrictions: null,
          notes: null,
        });
      }
    } else if (speaker.attending_after_party === false) {
      declinedSpeakerKeys.add(speakerKey);
    } else {
      unansweredSpeakerKeys.add(speakerKey);
    }
  }

  // 2. Admin-added after-party guests
  for (const guest of input.guests) {
    upsert(roster, attendeeKey(guest.email, `guest:${guest.id}`), 'activity_guest', {
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: normalizeEmail(guest.email),
      related_speaker_name: guest.related_speaker_name,
      guest_type: guest.guest_type,
      ticket: null,
      needs_vip_ticket: false,
      speaker_declined: false,
      dietary_restrictions: guest.dietary_restrictions,
      notes: guest.admin_notes,
    });
  }

  // 3. Confirmed VIP ticket holders — merged onto anyone already listed by email
  let complimentaryTickets = 0;
  for (const ticket of input.tickets) {
    if (isComplimentary(ticket)) complimentaryTickets += 1;
    const key = attendeeKey(ticket.email, `ticket:${ticket.id}`);
    const attendee = upsert(roster, key, 'vip_ticket', {
      first_name: ticket.first_name,
      last_name: ticket.last_name,
      email: normalizeEmail(ticket.email),
      related_speaker_name: null,
      guest_type: null,
      ticket: toTicketSummary(ticket),
      needs_vip_ticket: false,
      speaker_declined: declinedSpeakerKeys.has(key),
      dietary_restrictions: null,
      notes: null,
    });
    attendee.ticket ??= toTicketSummary(ticket);
    attendee.needs_vip_ticket = false;
  }

  const attendees = [...roster.values()].sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
  );

  const bySource = emptySourceCounts();
  let plusOnesNeedingTicket = 0;
  for (const attendee of attendees) {
    bySource[attendee.primary_source] += 1;
    if (attendee.needs_vip_ticket) plusOnesNeedingTicket += 1;
  }

  // A pending speaker who already holds a VIP ticket is on the list already
  const unanswered = [...unansweredSpeakerKeys].filter((key) => !roster.has(key)).length;
  const headcount = attendees.length;

  return {
    attendees,
    stats: {
      capacity,
      headcount,
      remaining: capacity - headcount,
      over_capacity: headcount > capacity,
      over_by: Math.max(0, headcount - capacity),
      by_source: bySource,
      vip_tickets_total: input.tickets.length,
      vip_tickets_complimentary: complimentaryTickets,
      plus_ones_needing_ticket: plusOnesNeedingTicket,
      speakers_unanswered: unanswered,
      speakers_declined: declinedSpeakerKeys.size,
      potential_headcount: headcount + unanswered,
    },
  };
}
