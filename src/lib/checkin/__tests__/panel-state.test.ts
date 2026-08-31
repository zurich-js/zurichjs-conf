import { describe, it, expect } from 'vitest';
import type { DoorCheckInResult, DoorResolveHit } from '@/lib/types/checkin';
import {
  canOfferCheckIn,
  checkedInAtFor,
  formatDoorTime,
  resolveDoorPanelDetail,
  resolveDoorPanelState,
  toneForOutcome,
} from '../panel-state';

function hit(overrides: Partial<DoorResolveHit> = {}): DoorResolveHit {
  return {
    found: true,
    subjectKind: 'ticket',
    subjectId: 't1',
    person: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com', company: null, jobTitle: null },
    ticket: {
      type: 'standard', category: 'standard', stage: 'general_admission',
      status: 'confirmed', isVip: false,
      transferredFromName: null, transferredFromEmail: null,
    },
    admissible: true,
    refusalReason: null,
    checkIn: { workshopDayAt: null, conferenceDayAt: null },
    goodie: { entitled: true, handedAt: null, note: null },
    apparel: { tshirtSize: 'L', hoodieSize: null },
    doorNote: null,
    workshops: { held: [], purchasedForOthers: [] },
    ...overrides,
  };
}

const applied: DoorCheckInResult = { outcome: 'applied' };
const duplicate: DoorCheckInResult = {
  outcome: 'duplicate',
  alreadyCheckedInAt: '2026-09-11T07:14:00.000Z',
};
const denied: DoorCheckInResult = { outcome: 'denied', failureReason: 'ticket_refunded' };
const notFound: DoorCheckInResult = { outcome: 'not_found', failureReason: 'subject_not_found' };

describe('checkedInAtFor', () => {
  it('reads the column for the occasion being worked, not the other one', () => {
    const attendee = hit({
      checkIn: { workshopDayAt: '2026-09-10T08:00:00.000Z', conferenceDayAt: null },
    });
    expect(checkedInAtFor(attendee, 'workshop_day')).toBe('2026-09-10T08:00:00.000Z');
    // Day-two re-entry must read as a fresh check-in, not a duplicate.
    expect(checkedInAtFor(attendee, 'conference_day')).toBeNull();
  });
});

describe('resolveDoorPanelState', () => {
  it('offers admission for a clean confirmed ticket', () => {
    expect(resolveDoorPanelState(hit(), 'conference_day')).toBe('admit');
  });

  it('shows admitted right after a successful check-in', () => {
    expect(resolveDoorPanelState(hit(), 'conference_day', applied)).toBe('admitted');
  });

  it('shows already when the roster says they are in', () => {
    const attendee = hit({
      checkIn: { workshopDayAt: null, conferenceDayAt: '2026-09-11T07:14:00.000Z' },
    });
    expect(resolveDoorPanelState(attendee, 'conference_day')).toBe('already');
  });

  it('shows already when the server reports a duplicate', () => {
    expect(resolveDoorPanelState(hit(), 'conference_day', duplicate)).toBe('already');
  });

  it('refuses an inadmissible subject even with no attempt yet', () => {
    const refunded = hit({ admissible: false, refusalReason: 'ticket_refunded' });
    expect(resolveDoorPanelState(refunded, 'conference_day')).toBe('refused');
  });

  // The station may hold a stale roster. If the server has just said no, that is
  // the fact the volunteer must act on — a refusal outranks everything.
  it('lets a fresh refusal outrank a roster that looked admissible', () => {
    expect(resolveDoorPanelState(hit(), 'conference_day', denied)).toBe('refused');
  });

  it('lets a fresh not_found outrank the roster too', () => {
    expect(resolveDoorPanelState(hit(), 'conference_day', notFound)).toBe('refused');
  });

  it('does not show admitted when the subject is inadmissible', () => {
    const refunded = hit({ admissible: false, refusalReason: 'ticket_refunded' });
    expect(resolveDoorPanelState(refunded, 'conference_day', applied)).toBe('refused');
  });

  it('treats each occasion independently', () => {
    const workshopOnly = hit({
      checkIn: { workshopDayAt: '2026-09-10T08:00:00.000Z', conferenceDayAt: null },
    });
    expect(resolveDoorPanelState(workshopOnly, 'workshop_day')).toBe('already');
    expect(resolveDoorPanelState(workshopOnly, 'conference_day')).toBe('admit');
  });
});

describe('canOfferCheckIn', () => {
  it('offers the action to a role that may check in', () => {
    expect(canOfferCheckIn(hit(), 'conference_day', true)).toBe(true);
  });

  it('withholds it from a role that may not', () => {
    expect(canOfferCheckIn(hit(), 'conference_day', false)).toBe(false);
  });

  it('withholds it for an inadmissible subject', () => {
    const refunded = hit({ admissible: false, refusalReason: 'ticket_refunded' });
    expect(canOfferCheckIn(refunded, 'conference_day', true)).toBe(false);
  });

  // Offering it again is how someone gets checked in twice and collects a
  // second goodie bag.
  it('withholds it for someone already checked in for this occasion', () => {
    const already = hit({
      checkIn: { workshopDayAt: null, conferenceDayAt: '2026-09-11T07:14:00.000Z' },
    });
    expect(canOfferCheckIn(already, 'conference_day', true)).toBe(false);
  });

  it('still offers it on the other occasion', () => {
    const already = hit({
      checkIn: { workshopDayAt: '2026-09-10T08:00:00.000Z', conferenceDayAt: null },
    });
    expect(canOfferCheckIn(already, 'conference_day', true)).toBe(true);
  });
});

describe('resolveDoorPanelDetail', () => {
  it('reports the prior arrival time from the server result', () => {
    const detail = resolveDoorPanelDetail('already', hit(), 'conference_day', duplicate);
    expect(detail).toMatch(/Arrived at \d{2}:\d{2}/);
  });

  it('falls back to the roster timestamp when there is no result', () => {
    const attendee = hit({
      checkIn: { workshopDayAt: null, conferenceDayAt: '2026-09-11T07:14:00.000Z' },
    });
    expect(resolveDoorPanelDetail('already', attendee, 'conference_day')).toMatch(/Arrived at/);
  });

  it('degrades gracefully when neither has a timestamp', () => {
    expect(resolveDoorPanelDetail('already', hit(), 'conference_day')).toBe(
      'Already recorded for today',
    );
  });

  it('gives no detail line where the headline says everything', () => {
    expect(resolveDoorPanelDetail('admit', hit(), 'conference_day')).toBeUndefined();
    expect(resolveDoorPanelDetail('refused', hit(), 'conference_day')).toBeUndefined();
  });
});

describe('formatDoorTime', () => {
  // Fixed to the venue timezone so two stations never disagree about an arrival.
  it('formats in Europe/Zurich regardless of the device locale', () => {
    expect(formatDoorTime('2026-09-11T07:14:00.000Z')).toBe('09:14');
  });

  it('handles the winter offset correctly', () => {
    expect(formatDoorTime('2026-01-11T07:14:00.000Z')).toBe('08:14');
  });

  it('returns the input rather than throwing on an unparseable value', () => {
    expect(formatDoorTime('not-a-date')).toBe('not-a-date');
  });
});

describe('toneForOutcome', () => {
  it.each([
    ['applied', 'success'],
    ['duplicate', 'duplicate'],
    ['denied', 'refused'],
    ['not_found', 'refused'],
  ] as const)('maps %s to the %s tone', (outcome, tone) => {
    expect(toneForOutcome(outcome)).toBe(tone);
  });
});
