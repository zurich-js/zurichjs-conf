/**
 * The door panel's decision logic, kept out of the component so it can be
 * tested and so the component stays presentational.
 *
 * Getting this wrong is how a volunteer hands out a second goodie bag, so the
 * precedence between "what the roster says" and "what the last attempt returned"
 * is spelled out rather than left to render-order accident.
 */

import type { DoorCheckInResult, DoorOccasion, DoorResolveHit } from '@/lib/types/checkin';

/**
 * `pickup` / `picked_up` are the community-day pair: that occasion has no
 * check-ins, so the badge IS the verdict the banner announces.
 */
export type DoorPanelState =
  | 'admit'
  | 'admitted'
  | 'already'
  | 'pickup'
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
  // A refunded conference ticket still refuses on conference day and on the
  // badge desk. On workshop day a held seat is its own admission, so the
  // banner reads the seats and the ticket's status is shown as a hint instead.
  if (!isAdmissibleFor(attendee, occasion)) return 'refused';

  // On the warm-up meetup the badge is the whole transaction, so the banner
  // reads it instead of the (non-existent) check-in state. Badges belong to
  // conference tickets; a workshop-only attendee has nothing to record there.
  if (occasion === 'community_day') {
    if (!attendee.ticket) return 'nothing_today';
    return attendee.badge.pickedUpAt ? 'picked_up' : 'pickup';
  }

  if (lastResult?.outcome === 'applied') return 'admitted';
  if (lastResult?.outcome === 'duplicate' || checkedInAtFor(attendee, occasion)) {
    return 'already';
  }
  return 'admit';
}

/**
 * Whether this person's workshop seats are what gets checked in today.
 *
 * True on workshop day for anyone holding at least one seat. The seats in
 * `held` are confirmed by construction (the roster index drops any other
 * status, mirroring door_workshops_for), so they stand on their own: a
 * conference ticket that is pending or refunded does not cancel a workshop
 * seat that was paid for separately.
 */
export function isSeatDriven(attendee: DoorResolveHit, occasion: DoorOccasion): boolean {
  return occasion === 'workshop_day' && attendee.workshops.held.length > 0;
}

/** A held seat still to check in, as the manual-admission form offers it. */
export interface ManualAdmitSeatOption {
  registrationId: string;
  title: string;
  startTime: string | null;
}

/**
 * The seats a manual admission may target, or undefined when the admission is
 * for the person (any day but workshop day, or a seat-less ticket holder).
 * Admitting the ticket of a seat holder on workshop day would stamp the
 * person-level column and leave every seat unchecked — so the form must name
 * a seat, and this is the list it names from.
 */
export function manualAdmitSeatOptions(
  attendee: DoorResolveHit,
  occasion: DoorOccasion
): ManualAdmitSeatOption[] | undefined {
  if (!isSeatDriven(attendee, occasion)) return undefined;
  return attendee.workshops.held
    .filter((seat) => seat.checkedInAt === null)
    .map((seat) => ({
      registrationId: seat.registrationId,
      title: seat.title,
      startTime: seat.startTime,
    }));
}

/**
 * Whether this person may be admitted today at all, irrespective of role.
 *
 * On workshop day a seat holder is admissible on the strength of the seat;
 * everywhere else the subject's own status decides. Badges and goodies keep
 * reading `attendee.admissible` directly — those follow the conference ticket.
 */
export function isAdmissibleFor(attendee: DoorResolveHit, occasion: DoorOccasion): boolean {
  return attendee.admissible || isSeatDriven(attendee, occasion);
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
    isAdmissibleFor(attendee, occasion) &&
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
  if (state === 'admitted') return 'Recorded — send them through';
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

/** Which feedback tone an outcome should play. */
export function toneForOutcome(
  outcome: DoorCheckInResult['outcome']
): 'success' | 'duplicate' | 'refused' {
  if (outcome === 'applied') return 'success';
  if (outcome === 'duplicate') return 'duplicate';
  return 'refused';
}
