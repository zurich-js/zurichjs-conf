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
import type {
  AfterPartyAttendee,
  AfterPartyGuestInput,
  AfterPartyRoster,
  AfterPartySource,
  AfterPartySpeakerInput,
  AfterPartyTicketInput,
  AfterPartyTicketSummary,
} from '@/lib/types/after-party';

export function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function attendeeKey(email: string | null | undefined, fallback: string): string {
  return normalizeEmail(email) ?? fallback;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Same person if the full names match, or at least the first names do — the
 * latter tolerates a maiden name or an initial on one side.
 */
function sameName(
  a: { first_name: string; last_name: string },
  b: { first_name: string; last_name: string }
): boolean {
  const aFirst = normalizeName(a.first_name);
  const bFirst = normalizeName(b.first_name);
  if (aFirst && aFirst === bFirst) return true;
  return normalizeName(`${a.first_name} ${a.last_name}`) === normalizeName(`${b.first_name} ${b.last_name}`);
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

  // 1a. Speakers who said yes. All speakers go in before any plus one so a
  //     speaker declared as another speaker's plus one is still a speaker.
  for (const speaker of input.speakers) {
    const speakerKey = attendeeKey(speaker.email, `speaker:${speaker.id}`);

    if (speaker.attending_after_party === true) {
      upsert(roster, speakerKey, 'speaker', {
        first_name: speaker.first_name,
        last_name: speaker.last_name,
        email: normalizeEmail(speaker.email),
        related_speaker_name: null,
        guest_type: null,
        ticket: null,
        needs_vip_ticket: false,
        speaker_declined: false,
        dietary_restrictions: speaker.dietary_restrictions,
        notes: null,
      });
    } else if (speaker.attending_after_party === false) {
      declinedSpeakerKeys.add(speakerKey);
    } else {
      unansweredSpeakerKeys.add(speakerKey);
    }
  }

  // 1b. The plus ones attending speakers declared
  for (const speaker of input.speakers) {
    if (speaker.attending_after_party !== true || speaker.after_party_plus_one !== true) continue;

    const speakerName = `${speaker.first_name} ${speaker.last_name}`.trim();
    const plusOneKey = attendeeKey(speaker.after_party_plus_one_email, `plus_one:${speaker.id}`);
    upsert(roster, plusOneKey, 'speaker_plus_one', {
      first_name: speaker.after_party_plus_one_first_name?.trim() || 'Plus one',
      last_name: speaker.after_party_plus_one_last_name?.trim() || `of ${speakerName}`,
      email: normalizeEmail(speaker.after_party_plus_one_email),
      related_speaker_name: speakerName,
      guest_type: null,
      ticket: null,
      // Resolved once VIP tickets are merged in below; a speaker already
      // listed above keeps their `false`
      needs_vip_ticket: true,
      speaker_declined: declinedSpeakerKeys.has(plusOneKey),
      dietary_restrictions: null,
      notes: null,
    });
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

  // 3. Confirmed VIP ticket holders — merged onto anyone already listed by
  //    email. Two tickets under one email but different names are two people
  //    (someone bought a seat for a partner), so those stay separate.
  let complimentaryTickets = 0;
  let mergedTickets = 0;
  for (const ticket of input.tickets) {
    if (isComplimentary(ticket)) complimentaryTickets += 1;

    let key = attendeeKey(ticket.email, `ticket:${ticket.id}`);
    const existing = roster.get(key);
    if (existing?.primary_source === 'vip_ticket' && !sameName(existing, ticket)) {
      key = `ticket:${ticket.id}`;
    }

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
    attendee.needs_vip_ticket = false;

    if (attendee.primary_source !== 'vip_ticket') {
      mergedTickets += 1;
      if (!sameName(attendee, ticket)) {
        const note = `VIP ticket is under the name ${ticket.first_name} ${ticket.last_name}`;
        attendee.notes = attendee.notes ? `${attendee.notes} · ${note}` : note;
      }
    }
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
      vip_tickets_merged: mergedTickets,
      plus_ones_needing_ticket: plusOnesNeedingTicket,
      speakers_unanswered: unanswered,
      speakers_declined: declinedSpeakerKeys.size,
      potential_headcount: headcount + unanswered,
    },
  };
}
