import { describe, it, expect } from 'vitest';
import { isDoorResolveHit } from '@/lib/types/checkin';
import type { DoorRoster, RosterRegistration, RosterTicket, RosterWorkshop } from '../roster';
import { buildRosterIndex, extractScannedId } from '../roster-index';

const TICKET_A = '11111111-1111-4111-8111-111111111111';
const TICKET_B = '22222222-2222-4222-8222-222222222222';
const SEAT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SEAT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SEAT_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const WORKSHOP = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function ticket(overrides: Partial<RosterTicket> = {}): RosterTicket {
  return {
    id: TICKET_A,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    jobTitle: 'Engineer',
    ticketType: 'conference',
    ticketCategory: 'standard',
    ticketStage: 'early_bird',
    status: 'confirmed',
    isVip: false,
    transferredFromName: null,
    transferredFromEmail: null,
    checkedInWorkshopDayAt: null,
    checkedInConferenceDayAt: null,
    goodieHandedAt: null,
    goodieNote: null,
    badgePickedUpAt: null,
    doorNote: null,
    tshirtSize: 'L',
    hoodieSize: 'M',
    ...overrides,
  };
}

function seat(overrides: Partial<RosterRegistration> = {}): RosterRegistration {
  return {
    id: SEAT_A,
    workshopId: WORKSHOP,
    ticketId: null,
    firstName: null,
    lastName: null,
    email: null,
    company: null,
    seatIndex: 0,
    checkedInAt: null,
    badgePickedUpAt: null,
    ...overrides,
  };
}

const workshop: RosterWorkshop = {
  id: WORKSHOP,
  title: 'Testing Effectively',
  room: 'Room 1',
  date: '2026-09-10',
  startTime: '09:00',
  endTime: '12:00',
};

function roster(overrides: Partial<DoorRoster> = {}): DoorRoster {
  return {
    occasion: 'conference_day',
    tickets: [],
    registrations: [],
    workshops: [workshop],
    generatedAt: '2026-09-11T06:00:00.000Z',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractScannedId
// ─────────────────────────────────────────────────────────────────────────────

describe('extractScannedId', () => {
  it('pulls the id out of the printed QR payload', () => {
    // The payload every already-printed badge carries. It cannot change.
    expect(extractScannedId(`https://zurichjs.com/validate/${TICKET_A}`)).toBe(TICKET_A);
  });

  it('tolerates a trailing slash, a query string and a fragment', () => {
    expect(extractScannedId(`https://zurichjs.com/validate/${TICKET_A}/`)).toBe(TICKET_A);
    expect(extractScannedId(`https://zurichjs.com/validate/${TICKET_A}?utm=qr`)).toBe(TICKET_A);
    expect(extractScannedId(`https://zurichjs.com/validate/${TICKET_A}#x`)).toBe(TICKET_A);
  });

  it('accepts a bare id, for the desk typing one off a printed sheet', () => {
    expect(extractScannedId(TICKET_A)).toBe(TICKET_A);
    expect(extractScannedId(`  ${TICKET_A}  `)).toBe(TICKET_A);
  });

  it('lowercases, because a hand-typed id may be upper case', () => {
    expect(extractScannedId(TICKET_A.toUpperCase())).toBe(TICKET_A);
  });

  it('returns null for a code that is not ours', () => {
    // Rejecting locally is the point: a wifi card or another event's QR must not
    // cost a network round trip to discover it is junk.
    expect(extractScannedId('WIFI:S:ZurichJS;T:WPA;P:hunter2;;')).toBeNull();
    expect(extractScannedId('https://example.com/validate/not-a-uuid')).toBeNull();
    expect(extractScannedId('')).toBeNull();
    expect(extractScannedId('   ')).toBeNull();
  });

  it('rejects a near-miss rather than truncating it', () => {
    // One hex digit short. Matching a prefix would resolve to the wrong person.
    expect(extractScannedId('11111111-1111-4111-8111-11111111111')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolve
// ─────────────────────────────────────────────────────────────────────────────

describe('buildRosterIndex().resolve', () => {
  it('resolves a ticket with everything the panel renders', () => {
    const index = buildRosterIndex(roster({ tickets: [ticket()] }));
    const result = index.resolve(TICKET_A);

    expect(isDoorResolveHit(result)).toBe(true);
    if (!isDoorResolveHit(result)) return;

    expect(result.subjectKind).toBe('ticket');
    expect(result.subjectId).toBe(TICKET_A);
    expect(result.person.firstName).toBe('Ada');
    expect(result.person.jobTitle).toBe('Engineer');
    expect(result.ticket?.stage).toBe('early_bird');
    expect(result.ticket?.status).toBe('confirmed');
    expect(result.apparel).toEqual({ tshirtSize: 'L', hoodieSize: 'M' });
    expect(result.admissible).toBe(true);
    expect(result.refusalReason).toBeNull();
  });

  it('carries transfer provenance, so a name mismatch is explained not disputed', () => {
    const index = buildRosterIndex(
      roster({
        tickets: [
          ticket({ transferredFromName: 'Grace Hopper', transferredFromEmail: 'grace@example.com' }),
        ],
      })
    );
    const result = index.resolve(TICKET_A);

    expect(isDoorResolveHit(result) && result.ticket?.transferredFromName).toBe('Grace Hopper');
  });

  it('resolves a scan case-insensitively', () => {
    const index = buildRosterIndex(roster({ tickets: [ticket()] }));
    expect(index.resolve(TICKET_A.toUpperCase()).found).toBe(true);
  });

  it('misses cleanly on an id in neither space', () => {
    const index = buildRosterIndex(roster({ tickets: [ticket()] }));
    expect(index.resolve(SEAT_C)).toEqual({ found: false, subjectKind: null });
  });

  it.each(['refunded', 'cancelled', 'pending'] as const)(
    'keeps a %s ticket resolvable but refused',
    (status) => {
      // Omitting it would make a charged-back ticket indistinguishable from a
      // stranger's code — and the remedy for "unknown" is to issue a free one.
      const index = buildRosterIndex(roster({ tickets: [ticket({ status })] }));
      const result = index.resolve(TICKET_A);

      expect(isDoorResolveHit(result)).toBe(true);
      if (!isDoorResolveHit(result)) return;
      expect(result.admissible).toBe(false);
      expect(result.refusalReason).toBe(`ticket_${status}`);
      expect(result.goodie.entitled).toBe(false);
    }
  );

  it('resolves a workshop-only seat with no conference ticket', () => {
    const index = buildRosterIndex(
      roster({
        occasion: 'workshop_day',
        registrations: [
          seat({ firstName: 'Alan', lastName: 'Turing', email: 'alan@example.com', company: 'NPL' }),
        ],
      })
    );
    const result = index.resolve(SEAT_A);

    expect(isDoorResolveHit(result)).toBe(true);
    if (!isDoorResolveHit(result)) return;

    expect(result.subjectKind).toBe('workshop_registration');
    expect(result.ticket).toBeNull();
    expect(result.admissible).toBe(true);
    // No conference ticket means no t-shirt. Confirmed with the organisers.
    expect(result.goodie.entitled).toBe(false);
    expect(result.apparel).toEqual({ tshirtSize: null, hoodieSize: null });
    expect(result.workshops.held).toHaveLength(1);
    expect(result.workshops.held[0]?.title).toBe('Testing Effectively');
  });

  it('prefers the ticket id space when a scan hits it', () => {
    const index = buildRosterIndex(
      roster({ tickets: [ticket()], registrations: [seat({ ticketId: TICKET_A })] })
    );
    expect(index.resolve(TICKET_A).subjectKind).toBe('ticket');
    expect(index.resolve(SEAT_A).subjectKind).toBe('workshop_registration');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seat attribution — the subtle rule, tested from both directions
// ─────────────────────────────────────────────────────────────────────────────

describe('seat attribution', () => {
  it('attributes a seat by its own email even when the ticket id points elsewhere', () => {
    // findTicketIdForSession stamps ONE ticket id on EVERY seat of a Stripe
    // session, so the buyer's id lands on a colleague's seat. Email wins.
    const index = buildRosterIndex(
      roster({
        tickets: [ticket({ id: TICKET_B, email: 'bob@example.com' }), ticket()],
        registrations: [seat({ ticketId: TICKET_A, email: 'bob@example.com' })],
      })
    );

    const bob = index.resolve(TICKET_B);
    expect(isDoorResolveHit(bob) && bob.workshops.held).toHaveLength(1);
    expect(isDoorResolveHit(bob) && bob.workshops.held[0]?.matchedBy).toBe('own_email');

    const ada = index.resolve(TICKET_A);
    expect(isDoorResolveHit(ada) && ada.workshops.held).toHaveLength(0);
    expect(isDoorResolveHit(ada) && ada.workshops.purchasedForOthers).toHaveLength(1);
    expect(isDoorResolveHit(ada) && ada.workshops.purchasedForOthers[0]?.attendeeEmail).toBe(
      'bob@example.com'
    );
  });

  it('attributes an unnamed seat to the ticket it was bought on', () => {
    // A blank seat names nobody, so the purchaser is the only candidate.
    const index = buildRosterIndex(
      roster({ tickets: [ticket()], registrations: [seat({ ticketId: TICKET_A, email: null })] })
    );
    const result = index.resolve(TICKET_A);

    expect(isDoorResolveHit(result) && result.workshops.held).toHaveLength(1);
    expect(isDoorResolveHit(result) && result.workshops.held[0]?.matchedBy).toBe('own_ticket');
  });

  it('attributes a seat naming the purchaser themselves to the purchaser', () => {
    const index = buildRosterIndex(
      roster({
        tickets: [ticket()],
        registrations: [seat({ ticketId: TICKET_A, email: 'ADA@example.com' })],
      })
    );
    const result = index.resolve(TICKET_A);

    // Matched on email despite the differing case.
    expect(isDoorResolveHit(result) && result.workshops.held[0]?.matchedBy).toBe('own_email');
  });

  it('splits a bulk purchase between the buyer and their colleagues', () => {
    const index = buildRosterIndex(
      roster({
        tickets: [ticket()],
        registrations: [
          seat({ id: SEAT_A, ticketId: TICKET_A, email: 'ada@example.com', seatIndex: 0 }),
          seat({ id: SEAT_B, ticketId: TICKET_A, email: 'bob@example.com', seatIndex: 1 }),
          seat({ id: SEAT_C, ticketId: TICKET_A, email: null, seatIndex: 2 }),
        ],
      })
    );
    const result = index.resolve(TICKET_A);

    expect(isDoorResolveHit(result)).toBe(true);
    if (!isDoorResolveHit(result)) return;

    // Ada's own seat plus the unassigned one; Bob's is theirs, not hers.
    expect(result.workshops.held.map((h) => h.registrationId).sort()).toEqual(
      [SEAT_A, SEAT_C].sort()
    );
    expect(result.workshops.purchasedForOthers.map((p) => p.registrationId)).toEqual([SEAT_B]);
  });

  it('resolves a colleague seat scanned directly to that colleague, not the buyer', () => {
    // Bob scans the seat QR he was forwarded. He has no ticket of his own.
    const index = buildRosterIndex(
      roster({
        occasion: 'workshop_day',
        tickets: [ticket()],
        registrations: [
          seat({ id: SEAT_B, ticketId: TICKET_A, email: 'bob@example.com', firstName: 'Bob' }),
        ],
      })
    );
    const result = index.resolve(SEAT_B);

    expect(isDoorResolveHit(result)).toBe(true);
    if (!isDoorResolveHit(result)) return;

    expect(result.person.firstName).toBe('Bob');
    expect(result.workshops.held.map((h) => h.registrationId)).toEqual([SEAT_B]);
    expect(result.workshops.purchasedForOthers).toHaveLength(0);
  });

  it('orders held seats by start time so the volunteer reads them in order', () => {
    const later: RosterWorkshop = {
      ...workshop,
      id: '99999999-9999-4999-8999-999999999999',
      title: 'Afternoon',
      startTime: '13:30',
    };
    const index = buildRosterIndex(
      roster({
        tickets: [ticket()],
        workshops: [later, workshop],
        registrations: [
          seat({ id: SEAT_A, workshopId: later.id, email: 'ada@example.com' }),
          seat({ id: SEAT_B, workshopId: WORKSHOP, email: 'ada@example.com' }),
        ],
      })
    );
    const result = index.resolve(TICKET_A);

    expect(isDoorResolveHit(result) && result.workshops.held.map((h) => h.title)).toEqual([
      'Testing Effectively',
      'Afternoon',
    ]);
  });

  it('falls back to a placeholder title when the workshop row is missing', () => {
    // A seat on an unpublished or deleted workshop must still admit the person.
    const index = buildRosterIndex(
      roster({
        workshops: [],
        registrations: [seat({ email: 'alan@example.com' })],
      })
    );
    const result = index.resolve(SEAT_A);

    expect(isDoorResolveHit(result) && result.workshops.held[0]?.title).toBe('Workshop');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// searchable
// ─────────────────────────────────────────────────────────────────────────────

describe('buildRosterIndex().searchable', () => {
  it('includes a workshop-only attendee who has no ticket row', () => {
    // Without this they are invisible to the desk on workshop day — the very
    // population most likely to need it, since many carry a blank badge.
    const index = buildRosterIndex(
      roster({
        occasion: 'workshop_day',
        tickets: [ticket()],
        registrations: [
          seat({ id: SEAT_B, email: 'alan@example.com', firstName: 'Alan', company: 'NPL' }),
        ],
      })
    );
    const records = index.searchable();

    expect(records).toHaveLength(2);
    const workshopOnly = records.find((r) => r.subjectKind === 'workshop_registration');
    expect(workshopOnly?.subjectId).toBe(SEAT_B);
    expect(workshopOnly?.company).toBe('NPL');
  });

  it('does not list a seat twice for someone who also holds a ticket', () => {
    const index = buildRosterIndex(
      roster({
        tickets: [ticket()],
        registrations: [
          seat({ id: SEAT_A, ticketId: TICKET_A }),
          seat({ id: SEAT_B, email: 'ADA@example.com' }),
        ],
      })
    );

    expect(index.searchable()).toHaveLength(1);
    expect(index.searchable()[0]?.subjectKind).toBe('ticket');
  });

  it('reports the arrival time for the occasion the roster was built for', () => {
    // The time, not a flag: the desk has to say "already in at 09:14", because a
    // bare "already checked in" invites admitting them a second time.
    const attended = ticket({ checkedInWorkshopDayAt: '2026-09-10T08:02:00.000Z' });

    expect(
      buildRosterIndex(roster({ occasion: 'workshop_day', tickets: [attended] })).searchable()[0]
        ?.checkedInAt
    ).toBe('2026-09-10T08:02:00.000Z');
    expect(
      buildRosterIndex(roster({ occasion: 'conference_day', tickets: [attended] })).searchable()[0]
        ?.checkedInAt
    ).toBeNull();
  });
});

describe('buildRosterIndex() metadata', () => {
  it('reports a size spanning both id spaces', () => {
    const index = buildRosterIndex(
      roster({ tickets: [ticket()], registrations: [seat(), seat({ id: SEAT_B })] })
    );

    expect(index.size).toBe(3);
    expect(index.occasion).toBe('conference_day');
    expect(index.generatedAt).toBe('2026-09-11T06:00:00.000Z');
  });

  it('handles an empty roster without throwing', () => {
    const index = buildRosterIndex(roster({ workshops: [] }));
    expect(index.size).toBe(0);
    expect(index.searchable()).toEqual([]);
    expect(index.resolve(TICKET_A).found).toBe(false);
  });
});
