/**
 * The door panel's decision logic, kept out of the component so it can be
 * tested and so the component stays presentational.
 *
 * Getting this wrong is how a volunteer hands out a second goodie bag, so the
 * precedence between "what the roster says" and "what the last attempt returned"
 * is spelled out rather than left to render-order accident.
 */

import type { DoorCheckInResult, DoorOccasion, DoorResolveHit } from '@/lib/types/checkin';

export type DoorPanelState = 'admit' | 'admitted' | 'already' | 'refused' | 'unknown';

/** When this attendee was checked in for the occasion being worked, if at all. */
export function checkedInAtFor(
  attendee: DoorResolveHit,
  occasion: DoorOccasion
): string | null {
  return occasion === 'workshop_day'
    ? attendee.checkIn.workshopDayAt
    : attendee.checkIn.conferenceDayAt;
}

/**
 * Resolve the banner state.
 *
 * Precedence, most to least significant:
 *   1. a refusal or a not-found from the last attempt — the newest fact wins;
 *   2. an inadmissible subject (refunded, cancelled, unpaid);
 *   3. a successful attempt just now;
 *   4. already checked in, whether from this attempt or the roster;
 *   5. otherwise ready to admit.
 *
 * A refusal outranks a success because a station may have a stale roster: if the
 * server has just said no, that is the truth the volunteer must act on.
 */
export function resolveDoorPanelState(
  attendee: DoorResolveHit,
  occasion: DoorOccasion,
  lastResult?: DoorCheckInResult | null
): DoorPanelState {
  if (lastResult?.outcome === 'denied' || lastResult?.outcome === 'not_found') {
    return 'refused';
  }
  if (!attendee.admissible) return 'refused';
  if (lastResult?.outcome === 'applied') return 'admitted';
  if (lastResult?.outcome === 'duplicate' || checkedInAtFor(attendee, occasion)) {
    return 'already';
  }
  return 'admit';
}

/**
 * Whether the check-in action should be offered.
 *
 * Hides the button rather than letting the volunteer press something the
 * database will refuse. The database still enforces all of this — this only
 * keeps the screen honest.
 */
export function canOfferCheckIn(
  attendee: DoorResolveHit,
  occasion: DoorOccasion,
  canCheckInByRole: boolean
): boolean {
  return canCheckInByRole && attendee.admissible && !checkedInAtFor(attendee, occasion);
}

/** Time in the venue's timezone, so two stations never disagree about an arrival. */
export function formatDoorTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Supporting line under the banner headline. */
export function resolveDoorPanelDetail(
  state: DoorPanelState,
  attendee: DoorResolveHit,
  occasion: DoorOccasion,
  lastResult?: DoorCheckInResult | null
): string | undefined {
  if (state === 'already') {
    const at = lastResult?.alreadyCheckedInAt ?? checkedInAtFor(attendee, occasion);
    return at ? `Arrived at ${formatDoorTime(at)}` : 'Already recorded for today';
  }
  if (state === 'admitted') return 'Recorded — send them through';
  return undefined;
}

/** Which feedback tone an outcome should play. */
export function toneForOutcome(
  outcome: DoorCheckInResult['outcome']
): 'success' | 'duplicate' | 'refused' {
  if (outcome === 'applied') return 'success';
  if (outcome === 'duplicate') return 'duplicate';
  return 'refused';
}
