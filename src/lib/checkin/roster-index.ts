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
  /** Every workshop with its confirmed seats, for the roll-call view. */
  workshops(): DoorWorkshopOverview[];
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

/** One confirmed seat in a workshop's attendee list. */
export interface DoorWorkshopSeatRow {
  registrationId: string;
  seatIndex: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  /**
   * Where the name came from. A seat bought on someone's own ticket often
   * carries no name of its own, so the ticket's name is used and marked as
   * such — a volunteer reading the list should know it is inferred.
   */
  nameSource: 'seat' | 'ticket' | 'none';
  checkedInAt: string | null;
}

/**
 * One workshop as the roll-call view shows it: the seats that count, and how
 * many of them have arrived. Mirrors door_dashboard's workshop-day figures,
 * which count confirmed seats only.
 */
export interface DoorWorkshopOverview {
  workshopId: string;
  title: string;
  room: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  seats: DoorWorkshopSeatRow[];
  total: number;
  checkedIn: number;
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
      tshirtHandedAt: ticket.tshirtHandedAt,
      hoodieHandedAt: ticket.hoodieHandedAt,
      hoodieEligible: ticket.hoodieEligible,
      hoodieExclusion: ticket.hoodieExclusion,
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
 *
 * Only CONFIRMED seats take part, as in door_workshops_for. The roster ships
 * every seat so a refunded one still resolves when scanned directly (and is
 * refused with a reason), but it is nobody's held seat and appears on no list.
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
      if (seat.status !== 'confirmed') continue;
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
        // The seat's own payment status decides, exactly as door_resolve does.
        admissible: registration.status === 'confirmed',
        refusalReason:
          registration.status === 'confirmed' ? null : `registration_${registration.status}`,
        checkIn: { workshopDayAt: registration.checkedInAt, conferenceDayAt: null },
        goodie: {
          entitled: false,
          handedAt: null,
          note: null,
          tshirtHandedAt: null,
          hoodieHandedAt: null,
          hoodieEligible: false,
          hoodieExclusion: null,
        },
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
      if (seat.status !== 'confirmed') continue;
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

  /**
   * Who is sitting in a seat, for the roll-call list.
   *
   * A seat names its attendee when the buyer filled the form in. When it does
   * not, the seat belongs to whoever it was bought on — the same rule seatsFor
   * applies — so that ticket's name is shown and flagged as inferred.
   */
  function seatRow(seat: RosterRegistration): DoorWorkshopSeatRow {
    if (seat.firstName || seat.lastName) {
      return {
        registrationId: seat.id,
        seatIndex: seat.seatIndex,
        firstName: seat.firstName,
        lastName: seat.lastName,
        email: seat.email,
        company: seat.company,
        nameSource: 'seat',
        checkedInAt: seat.checkedInAt,
      };
    }

    const seatEmail = seat.email?.toLowerCase() ?? null;
    const byEmail = seatEmail ? ticketsByEmail.get(seatEmail) : undefined;
    const byTicket =
      seat.ticketId && seatEmail === null ? ticketsById.get(seat.ticketId) : undefined;
    const owner = byEmail ?? byTicket;

    return {
      registrationId: seat.id,
      seatIndex: seat.seatIndex,
      firstName: owner?.firstName ?? null,
      lastName: owner?.lastName ?? null,
      email: seat.email ?? owner?.email ?? null,
      company: seat.company ?? owner?.company ?? null,
      nameSource: owner ? 'ticket' : 'none',
      checkedInAt: seat.checkedInAt,
    };
  }

  function workshops(): DoorWorkshopOverview[] {
    const byWorkshop = new Map<string, DoorWorkshopOverview>();
    for (const w of roster.workshops) {
      byWorkshop.set(w.id, {
        workshopId: w.id,
        title: w.title,
        room: w.room,
        date: w.date,
        startTime: w.startTime,
        endTime: w.endTime,
        seats: [],
        total: 0,
        checkedIn: 0,
      });
    }

    for (const seat of roster.registrations) {
      if (seat.status !== 'confirmed') continue;
      let entry = byWorkshop.get(seat.workshopId);
      if (!entry) {
        // A seat whose workshop row is missing still has a person in it.
        entry = {
          workshopId: seat.workshopId,
          title: 'Workshop',
          room: null,
          date: null,
          startTime: null,
          endTime: null,
          seats: [],
          total: 0,
          checkedIn: 0,
        };
        byWorkshop.set(seat.workshopId, entry);
      }
      entry.seats.push(seatRow(seat));
    }

    const collator = new Intl.Collator('en', { sensitivity: 'base' });
    const sortKey = (row: DoorWorkshopSeatRow) =>
      [row.lastName, row.firstName, row.company, row.email].filter(Boolean).join(' ');

    const result = [...byWorkshop.values()];
    for (const entry of result) {
      // Named seats first, alphabetically by surname — the order a roll call is
      // read in. Unnamed seats sink to the bottom rather than scattering.
      entry.seats.sort((a, b) => {
        const aNamed = a.firstName || a.lastName ? 0 : 1;
        const bNamed = b.firstName || b.lastName ? 0 : 1;
        if (aNamed !== bNamed) return aNamed - bNamed;
        return collator.compare(sortKey(a), sortKey(b)) || a.seatIndex - b.seatIndex;
      });
      entry.total = entry.seats.length;
      entry.checkedIn = entry.seats.filter((row) => row.checkedInAt !== null).length;
    }

    result.sort(
      (a, b) =>
        (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99') ||
        collator.compare(a.title, b.title)
    );
    return result;
  }

  return {
    resolve,
    searchable,
    workshops,
    occasion: roster.occasion,
    generatedAt: roster.generatedAt,
    size: ticketsById.size + registrationsById.size,
  };
}
