/**
 * Venue-clock helpers for the schedule's feedback mode.
 *
 * Everything here is pure and takes the current instant as an argument so it
 * can run on the server (to reject feedback for a talk that hasn't started)
 * and in the browser (to decide which cards show the form) and be unit
 * tested without faking timers. All comparisons happen in Europe/Zurich, the
 * venue timezone, regardless of where the visitor or server is.
 */

import { publicProgramTabs } from '@/data/public-program';
import type { ScheduleDayParam, ScheduleItemLiveStatus, ScheduleTiming, ZurichClock } from './types';

const VENUE_TIMEZONE = 'Europe/Zurich';

/**
 * Feedback stays open this many days after the last conference day so people
 * who rate on the train home still count, then the forms disappear.
 */
export const FEEDBACK_GRACE_DAYS = 3;

const WORKSHOP_DAY_DATE = publicProgramTabs.find((tab) => tab.id === 'warmup')?.sessionDate ?? '2026-09-10';
export const CONFERENCE_DAY_DATE = publicProgramTabs.find((tab) => tab.id === 'conference')?.sessionDate ?? '2026-09-11';

const clockFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VENUE_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Project a UTC instant onto the venue's wall clock. */
export function getZurichClock(now: Date): ZurichClock {
  const parts = clockFormatter.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00';
  const hour = Number(read('hour')) % 24;
  return {
    date: `${read('year')}-${read('month')}-${read('day')}`,
    minutesOfDay: hour * 60 + Number(read('minute')),
  };
}

/** `HH:MM[:SS]` → minutes since midnight. Malformed input counts as midnight. */
export function parseClockMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  const total = Number(hours) * 60 + Number(minutes);
  return Number.isFinite(total) ? total : 0;
}

/** Add whole days to a `YYYY-MM-DD` string (UTC arithmetic — no DST involved). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export const FEEDBACK_CLOSE_DATE = addDays(CONFERENCE_DAY_DATE, FEEDBACK_GRACE_DAYS);

export function getScheduleItemStatus(item: ScheduleTiming, clock: ZurichClock): ScheduleItemLiveStatus {
  if (item.date < clock.date) return 'past';
  if (item.date > clock.date) return 'upcoming';

  const start = parseClockMinutes(item.start_time);
  if (clock.minutesOfDay < start) return 'upcoming';
  if (clock.minutesOfDay < start + Math.max(item.duration_minutes, 0)) return 'live';
  return 'past';
}

/**
 * Feedback opens the moment a session starts and closes a few days after the
 * conference. Upcoming sessions never accept feedback — that's enforced here
 * for the UI and again by the API.
 */
export function isFeedbackOpen(item: ScheduleTiming, clock: ZurichClock): boolean {
  if (clock.date > FEEDBACK_CLOSE_DATE) return false;
  return getScheduleItemStatus(item, clock) !== 'upcoming';
}

/**
 * Which tab /schedule should open on when the URL doesn't say. Before the
 * event the community day stays the entry point; on workshop day we jump to
 * the workshops; from conference day onwards the conference programme (and
 * its feedback forms) is what people come for.
 */
export function resolveDefaultScheduleDay(clock: ZurichClock): ScheduleDayParam {
  if (clock.date >= CONFERENCE_DAY_DATE) return 'conf';
  if (clock.date === WORKSHOP_DAY_DATE) return 'workshop';
  return 'community';
}

/** True on the days the schedule content is changing under people's feet. */
export function isEventDay(clock: ZurichClock): boolean {
  return clock.date >= WORKSHOP_DAY_DATE && clock.date <= FEEDBACK_CLOSE_DATE;
}
