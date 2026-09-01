import { describe, it, expect } from 'vitest';
import { checkinKeys, type DoorEventListParams } from '../query-keys';

const WORKSHOP = { occasion: 'workshop_day' } as const;
const CONFERENCE = { occasion: 'conference_day' } as const;

const EVENT_FILTER: DoorEventListParams = {
  occasion: '',
  eventType: '',
  subjectId: null,
  staffId: null,
};

describe('checkinKeys', () => {
  it('roots every key under ["checkin"]', () => {
    expect(checkinKeys.session()[0]).toBe('checkin');
    expect(checkinKeys.roster(WORKSHOP)[0]).toBe('checkin');
    expect(checkinKeys.registrations(WORKSHOP)[0]).toBe('checkin');
    expect(checkinKeys.workshops()[0]).toBe('checkin');
    expect(checkinKeys.attendee('t1')[0]).toBe('checkin');
    expect(checkinKeys.staffList()[0]).toBe('checkin');
    expect(checkinKeys.eventList(EVENT_FILTER)[0]).toBe('checkin');
  });

  it('keeps the four prefetches on separate keys so they fire concurrently', () => {
    const keys = [
      JSON.stringify(checkinKeys.session()),
      JSON.stringify(checkinKeys.roster(WORKSHOP)),
      JSON.stringify(checkinKeys.registrations(WORKSHOP)),
      JSON.stringify(checkinKeys.workshops()),
    ];
    expect(new Set(keys).size).toBe(4);
  });

  it('does not nest the roster under a prefix that would also match registrations', () => {
    // Invalidating one prefetch must not sweep another away.
    const roster = checkinKeys.roster(WORKSHOP) as readonly unknown[];
    const registrations = checkinKeys.registrations(WORKSHOP) as readonly unknown[];
    expect(roster.slice(0, 2)).not.toEqual(registrations.slice(0, 2));
  });

  it('separates the roster per occasion, because the populations differ', () => {
    // Workshop day includes attendees with no conference ticket at all.
    expect(checkinKeys.roster(WORKSHOP)).not.toEqual(checkinKeys.roster(CONFERENCE));
    expect(checkinKeys.registrations(WORKSHOP)).not.toEqual(
      checkinKeys.registrations(CONFERENCE),
    );
  });

  it('keeps staff sub-keys under the staff key so domain invalidation matches', () => {
    expect(checkinKeys.staffList().slice(0, 2)).toEqual([...checkinKeys.staff()]);
    expect(checkinKeys.staffActivity('s1').slice(0, 2)).toEqual([...checkinKeys.staff()]);
  });

  it('keeps the event list under the events key', () => {
    expect(checkinKeys.eventList(EVENT_FILTER).slice(0, 2)).toEqual([
      ...checkinKeys.events(),
    ]);
  });

  it('includes every response-affecting filter in the event key', () => {
    expect(checkinKeys.eventList({ ...EVENT_FILTER, occasion: 'workshop_day' })).not.toEqual(
      checkinKeys.eventList(EVENT_FILTER),
    );
    expect(checkinKeys.eventList({ ...EVENT_FILTER, eventType: 'goodie_handed' })).not.toEqual(
      checkinKeys.eventList(EVENT_FILTER),
    );
    expect(checkinKeys.eventList({ ...EVENT_FILTER, subjectId: 't1' })).not.toEqual(
      checkinKeys.eventList(EVENT_FILTER),
    );
    expect(checkinKeys.eventList({ ...EVENT_FILTER, staffId: 's1' })).not.toEqual(
      checkinKeys.eventList(EVENT_FILTER),
    );
  });

  it('gives each attendee its own key so one write cannot disturb another', () => {
    expect(checkinKeys.attendee('t1')).not.toEqual(checkinKeys.attendee('t2'));
  });

  it('is stable across calls, so keys are usable as cache identities', () => {
    expect(checkinKeys.roster(WORKSHOP)).toEqual(checkinKeys.roster({ occasion: 'workshop_day' }));
  });
});
