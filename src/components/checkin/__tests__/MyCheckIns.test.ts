import { describe, it, expect } from 'vitest';
import { countMyActions } from '../MyCheckIns';
import type { DoorEventRecord } from '@/lib/checkin/events';

function event(
  eventType: DoorEventRecord['eventType'],
  outcome: DoorEventRecord['outcome'] = 'applied'
): DoorEventRecord {
  return {
    id: `${eventType}-${outcome}-${Math.random()}`,
    eventType,
    occasion: 'conference_day',
    outcome,
    staffRole: 'scanner',
    staffEmail: 'scanner@zurichjs.com',
    station: null,
    occurredAt: '2026-09-11T07:14:00.000Z',
    recordedAt: '2026-09-11T07:14:01.000Z',
    failureReason: null,
    notes: null,
    metadata: {},
    subjectKind: 'ticket',
    attendeeName: 'Ada Lovelace',
  };
}

describe('countMyActions', () => {
  it('counts applied admissions on a check-in day, scanned or manual', () => {
    const events = [event('checked_in'), event('manual_admit'), event('checked_in')];
    expect(countMyActions(events, 'conference_day')).toBe(3);
  });

  it('ignores second scans and refusals', () => {
    const events = [
      event('checked_in'),
      event('checked_in', 'duplicate'),
      event('denied', 'denied'),
      event('denied', 'not_found'),
    ];
    expect(countMyActions(events, 'workshop_day')).toBe(1);
  });

  it('takes this volunteer\'s own undos back off', () => {
    const events = [event('checked_in'), event('checked_in'), event('check_in_undone')];
    expect(countMyActions(events, 'conference_day')).toBe(1);
  });

  // The warm-up meetup has no check-ins; counting them there read "0 admitted"
  // over a list full of handovers.
  it('counts badges, not admissions, on the warm-up meetup', () => {
    const events = [
      event('badge_pickup'),
      event('badge_pickup'),
      event('badge_pickup', 'duplicate'),
      event('badge_pickup_undone'),
    ];
    expect(countMyActions(events, 'community_day')).toBe(1);
    expect(countMyActions(events, 'conference_day')).toBe(0);
  });

  it('never goes negative when the undo is all that is left on the page', () => {
    expect(countMyActions([event('check_in_undone')], 'conference_day')).toBe(0);
  });
});
