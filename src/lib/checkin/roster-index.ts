/**
 * The in-memory index that makes a scan cost nothing.
 *
 * A station prefetches the roster once per shift, builds this, and then resolves
 * every scan from a Map. That is the whole reason the read path makes no network
 * request: the alternative is three round trips per attendee, which is what the
 * current flow does.
 *
 * Everything here is pure. It takes a roster and gives back lookups, so it is
 * unit-testable without a browser, a camera or a database.
 */

import type {
  DoorHeldWorkshop,
  DoorOccasion,
  DoorPurchasedForOther,
  DoorResolveHit,
  DoorResolveResult,
} from '@/lib/types/checkin';
import type { DoorRoster, RosterRegistration, RosterTicket } from './roster';

export interface DoorRosterIndex {
  /** Resolve a scanned UUID across BOTH id spaces. */
  resolve(scannedId: string): DoorResolveResult;
  /** Everyone, for the desk's search. */
  searchable(): DoorSearchableRecord[];
  readonly occasion: DoorOccasion;
  readonly generatedAt: string;
  readonly size: number;
}

/** A flattened person for the fallback desk to search over. */
export interface DoorSearchableRecord {
  /** The id to pass to a check-in — a ticket id, or a registration id. */
  subjectId: string;
  subjectKind: 'ticket' | 'workshop_registration';
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  ticketCategory: string | null;
  /**
   * When they were admitted for the roster's occasion, or null.
   *
   * The timestamp rather than a boolean, because the desk has to be able to say
   * "already in at 09:14" — a bare "already checked in" invites the volunteer to
   * assume a glitch and admit them again.
   */
  checkedInAt: string | null;
}

/**
 * The QR payload is a URL, not a bare id: `${baseUrl}/validate/${uuid}`. Those
 * codes are already printed and emailed, so the payload cannot change — the
 * station has to pull the id out of whatever the camera reads.
 *
 * Matches a UUID anywhere in the string so it works for the full URL, a bare
 * id typed by hand, and a URL with a query string or a trailing slash.
 */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extract the subject id from a scanned code.
 *
 * Returns null for anything without a UUID — a QR from another event, a URL
 * shortener, a wifi config card — so the station can say "not one of ours"
 * rather than sending a junk lookup to the server.
 */
export function extractScannedId(raw: string): string | null {
  const match = UUID_PATTERN.exec(raw.trim());
  return match ? match[0].toLowerCase() : null;
}

function ticketToHit(
  ticket: RosterTicket,
  workshops: DoorWorkshopsFor
): DoorResolveHit {
  return {
    found: true,
    subjectKind: 'ticket',
    subjectId: ticket.id,
    person: {
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      email: ticket.email,
      company: ticket.company,
      jobTitle: ticket.jobTitle,
    },
    ticket: {
      type: ticket.ticketType,
      category: ticket.ticketCategory,
      stage: ticket.ticketStage,
      status: ticket.status,
      isVip: ticket.isVip,
      transferredFromName: ticket.transferredFromName,
      transferredFromEmail: ticket.transferredFromEmail,
    },
    admissible: ticket.status === 'confirmed',
    refusalReason: ticket.status === 'confirmed' ? null : `ticket_${ticket.status}`,
    checkIn: {
      workshopDayAt: ticket.checkedInWorkshopDayAt,
      conferenceDayAt: ticket.checkedInConferenceDayAt,
    },
    // Entitlement follows the conference ticket, so a workshop-only attendee is
    // false here by construction rather than by a special case.
    goodie: {
      entitled: ticket.status === 'confirmed',
      handedAt: ticket.goodieHandedAt,
      note: ticket.goodieNote,
    },
    apparel: { tshirtSize: ticket.tshirtSize, hoodieSize: ticket.hoodieSize },
    badge: { pickedUpAt: ticket.badgePickedUpAt },
    doorNote: ticket.doorNote,
    workshops,
  };
}

interface DoorWorkshopsFor {
  held: DoorHeldWorkshop[];
  purchasedForOthers: DoorPurchasedForOther[];
}

/**
 * Build the index.
 *
 * The seat-attribution rule is the subtle part and mirrors door_workshops_for
 * exactly, because the station and the server must agree:
 *
 *   findTicketIdForSession stamps ONE ticket id on EVERY seat of a Stripe
 *   session, so a purchaser's ticket absorbs their colleagues' seats. A seat is
 *   the person's if its own email matches them; a seat sharing their ticket_id
 *   is theirs only if it names nobody else. Anything else is a seat they paid
 *   for on someone else's behalf.
 *
 * Getting this backwards paints the buyer's name on a colleague's scan.
 */
export function buildRosterIndex(roster: DoorRoster): DoorRosterIndex {
  const workshopById = new Map(roster.workshops.map((w) => [w.id, w]));

  const ticketsById = new Map<string, RosterTicket>();
  const ticketsByEmail = new Map<string, RosterTicket>();
  for (const ticket of roster.tickets) {
    ticketsById.set(ticket.id, ticket);
    ticketsByEmail.set(ticket.email.toLowerCase(), ticket);
  }

  const registrationsById = new Map<string, RosterRegistration>();
  for (const registration of roster.registrations) {
    registrationsById.set(registration.id, registration);
  }

  function seatsFor(ticketId: string | null, email: string | null): DoorWorkshopsFor {
    const held: DoorHeldWorkshop[] = [];
    const purchasedForOthers: DoorPurchasedForOther[] = [];
    const lowerEmail = email?.toLowerCase() ?? null;

    for (const seat of roster.registrations) {
      const seatEmail = seat.email?.toLowerCase() ?? null;
      const byEmail = lowerEmail !== null && seatEmail === lowerEmail;
      const byTicket = ticketId !== null && seat.ticketId === ticketId;

      if (!byEmail && !byTicket) continue;

      const workshop = workshopById.get(seat.workshopId);

      // Rule 1: the seat's own email wins outright.
      // Rule 2: a shared ticket_id counts only when the seat names nobody else.
      const isTheirs = byEmail || (byTicket && (seatEmail === null || seatEmail === lowerEmail));

      if (isTheirs) {
        held.push({
          registrationId: seat.id,
          workshopId: seat.workshopId,
          title: workshop?.title ?? 'Workshop',
          room: workshop?.room ?? null,
          date: workshop?.date ?? null,
          startTime: workshop?.startTime ?? null,
          endTime: workshop?.endTime ?? null,
          seatIndex: seat.seatIndex,
          checkedInAt: seat.checkedInAt,
          matchedBy: byEmail ? 'own_email' : 'own_ticket',
        });
      } else {
        purchasedForOthers.push({
          registrationId: seat.id,
          title: workshop?.title ?? 'Workshop',
          attendeeEmail: seat.email,
        });
      }
    }

    held.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
    return { held, purchasedForOthers };
  }

  function resolve(scannedId: string): DoorResolveResult {
    const id = scannedId.toLowerCase();

    const ticket = ticketsById.get(id);
    if (ticket) {
      return ticketToHit(ticket, seatsFor(ticket.id, ticket.email));
    }

    const registration = registrationsById.get(id);
    if (registration) {
      const seats = seatsFor(registration.ticketId, registration.email);

      return {
        found: true,
        subjectKind: 'workshop_registration',
        subjectId: registration.id,
        person: {
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email,
          // The only identifying detail an unnamed seat carries, so the desk can
          // find the person by their employer.
          company: registration.company,
          jobTitle: null,
        },
        // No conference ticket at all. A legitimate state, not an error.
        ticket: null,
        admissible: true,
        refusalReason: null,
        checkIn: { workshopDayAt: registration.checkedInAt, conferenceDayAt: null },
        goodie: { entitled: false, handedAt: null, note: null },
        apparel: { tshirtSize: null, hoodieSize: null },
        badge: { pickedUpAt: registration.badgePickedUpAt },
        doorNote: null,
        workshops: seats,
      };
    }

    return { found: false, subjectKind: null };
  }

  function searchable(): DoorSearchableRecord[] {
    const records: DoorSearchableRecord[] = roster.tickets.map((ticket) => ({
      subjectId: ticket.id,
      subjectKind: 'ticket' as const,
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      email: ticket.email,
      company: ticket.company,
      ticketCategory: ticket.ticketCategory,
      checkedInAt:
        roster.occasion === 'workshop_day'
          ? ticket.checkedInWorkshopDayAt
          : ticket.checkedInConferenceDayAt,
    }));

    // Workshop-only attendees have no ticket row, so without this they would be
    // invisible to the desk on workshop day — the population most likely to need
    // it, since many hold a blank badge.
    for (const seat of roster.registrations) {
      if (seat.ticketId && ticketsById.has(seat.ticketId)) continue;
      if (seat.email && ticketsByEmail.has(seat.email.toLowerCase())) continue;

      records.push({
        subjectId: seat.id,
        subjectKind: 'workshop_registration',
        firstName: seat.firstName,
        lastName: seat.lastName,
        email: seat.email,
        company: seat.company,
        ticketCategory: null,
        checkedInAt: seat.checkedInAt,
      });
    }

    return records;
  }

  return {
    resolve,
    searchable,
    occasion: roster.occasion,
    generatedAt: roster.generatedAt,
    size: ticketsById.size + registrationsById.size,
  };
}
