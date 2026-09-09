/**
 * The door panel's decision logic, kept out of the component so it can be
 * tested and so the component stays presentational.
 *
 * Getting this wrong is how a volunteer hands out a second goodie bag, so the
 * precedence between "what the roster says" and "what the last attempt returned"
 * is spelled out rather than left to render-order accident.
 */

import {
  roleCan,
  type DoorCheckInResult,
  type DoorOccasion,
  type DoorResolveHit,
  type DoorRole,
} from '@/lib/types/checkin';

/**
 * `pickup` / `handed` / `picked_up` are the community-day trio: that occasion
 * has no check-ins, so the badge IS the verdict the banner announces. `handed`
 * is the badge counterpart of `admitted` — recorded just now, on this station.
 */
export type DoorPanelState =
  | 'admit'
  | 'admitted'
  | 'already'
  | 'pickup'
  | 'handed'
  | 'picked_up'
  | 'nothing_today'
  | 'refused'
  | 'unknown';

/** How far through their workshop-day check-ins this person is. */
export interface WorkshopSeatProgress {
  total: number;
  checkedIn: number;
}

/**
 * On workshop day the unit of check-in is the SEAT, not the person: someone
 * attending a morning and an afternoon workshop is checked in twice, once at
 * each door. This is what the per-seat buttons and the banner both read.
 */
export function workshopSeatProgress(
  attendee: DoorResolveHit,
  occasion: DoorOccasion
): WorkshopSeatProgress {
  if (occasion !== 'workshop_day') return { total: 0, checkedIn: 0 };
  const held = attendee.workshops.held;
  return {
    total: held.length,
    checkedIn: held.filter((seat) => seat.checkedInAt !== null).length,
  };
}

/**
 * When this attendee was checked in for the occasion being worked, if at all.
 *
 * On workshop day, someone holding seats counts as checked in only when EVERY
 * seat is — the value returned is the latest seat arrival, so "already" can
 * still say when. Someone with no seats falls back to the person-level
 * workshop-day arrival (a conference ticket holder helping out, or a seat the
 * index could not attribute).
 */
export function checkedInAtFor(
  attendee: DoorResolveHit,
  occasion: DoorOccasion
): string | null {
  // The warm-up meetup has no check-ins at all, only badge pickups.
  if (occasion === 'community_day') return null;
  if (occasion !== 'workshop_day') return attendee.checkIn.conferenceDayAt;

  const seats = attendee.workshops.held;
  if (seats.length === 0) return attendee.checkIn.workshopDayAt;

  let latest: string | null = null;
  for (const seat of seats) {
    if (!seat.checkedInAt) return null;
    if (!latest || seat.checkedInAt > latest) latest = seat.checkedInAt;
  }
  return latest;
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

  // On the warm-up meetup the badge is the whole transaction, so the banner
  // reads it instead of the (non-existent) check-in state. Badges belong to
  // conference tickets; a workshop-only attendee has nothing to record there.
  if (occasion === 'community_day') {
    if (!attendee.ticket) return 'nothing_today';
    // A handover recorded on THIS station just now reads as a success, not as
    // "already picked up" — the latter is what a second scan should say.
    if (lastResult?.outcome === 'applied') return 'handed';
    return attendee.badge.pickedUpAt ? 'picked_up' : 'pickup';
  }

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
  return (
    occasion !== 'community_day' &&
    canCheckInByRole &&
    attendee.admissible &&
    !checkedInAtFor(attendee, occasion)
  );
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
  if (state === 'admitted' || state === 'handed') return 'Recorded — send them through';
  if (state === 'picked_up') {
    const at = attendee.badge.pickedUpAt;
    return at ? `Handed over at ${formatDoorTime(at)}` : 'Already handed over';
  }
  if (state === 'pickup') return 'Hand over their badge';
  if (state === 'nothing_today') {
    return 'Workshop only — their check-in happens at the workshop door';
  }
  if (state === 'admit') {
    // Someone mid-way through a multi-workshop day: say so, or the second
    // door's volunteer wonders why a "ready to admit" person claims to be in.
    const seats = workshopSeatProgress(attendee, occasion);
    if (seats.total > 0 && seats.checkedIn > 0) {
      return `${seats.checkedIn} of ${seats.total} workshops checked in`;
    }
    if (seats.total > 1) {
      return `${seats.total} workshops today — check in each one below`;
    }
  }
  return undefined;
}

/** What a scan records on its own, before the volunteer touches anything. */
export type DoorScanAutoAction =
  | { kind: 'check_in'; subjectId: string }
  | { kind: 'badge_pickup'; subjectId: string };

/**
 * The scan IS the action.
 *
 * A volunteer at a door does not need a button between "this badge is valid"
 * and "let them in": the person is standing right there, and the tap was one
 * more thing to do per attendee with a queue behind them. So a scan records
 * the day's primary action by itself, and the panel offers an undo instead —
 * the "wrong person of a pair" mistake is noticed within a second either way.
 *
 * Returns null when nothing should be recorded without a human deciding:
 *   - the role may not do it, the subject is inadmissible, or it is already
 *     done — all of which the banner explains;
 *   - workshop day with more than one seat still open: the volunteer stands at
 *     ONE workshop's door and the station cannot know which;
 *   - a workshop-only attendee on the warm-up meetup, who has no badge.
 *
 * The lookup path must never reach this. Nobody verified a code there, so that
 * admission is a manual one with a reason — the caller withholds the call.
 */
export function resolveScanAutoAction(
  attendee: DoorResolveHit,
  occasion: DoorOccasion,
  role: DoorRole
): DoorScanAutoAction | null {
  if (!attendee.admissible) return null;

  // The warm-up meetup hands badges and never checks anyone in.
  if (occasion === 'community_day') {
    if (!roleCan(role, 'badge_pickup') || !attendee.ticket || attendee.badge.pickedUpAt) {
      return null;
    }
    return { kind: 'badge_pickup', subjectId: attendee.subjectId };
  }

  if (!canOfferCheckIn(attendee, occasion, roleCan(role, 'check_in'))) return null;

  const seats = attendee.workshops.held;
  if (occasion === 'workshop_day' && seats.length > 0) {
    const open = seats.filter((seat) => seat.checkedInAt === null);
    const [only] = open;
    if (open.length !== 1 || !only) return null;
    return { kind: 'check_in', subjectId: only.registrationId };
  }

  return { kind: 'check_in', subjectId: attendee.subjectId };
}

/** Which feedback tone an outcome should play. */
export function toneForOutcome(
  outcome: DoorCheckInResult['outcome']
): 'success' | 'duplicate' | 'refused' {
  if (outcome === 'applied') return 'success';
  if (outcome === 'duplicate') return 'duplicate';
  return 'refused';
}
