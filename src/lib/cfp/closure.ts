/**
 * CFP closure helpers.
 */

import { timelineData } from '@/data/timeline';

const CFP_ENDS_DATE_ISO =
  timelineData.entries.find((entry) => entry.id === 'cfp-ends')?.dateISO ?? '2026-04-03';
const CFP_TIMEZONE = 'Europe/Zurich';

function getTimezoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(utcMs));

  const offsetLabel = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = offsetLabel.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] ?? '0', 10);
  return sign * (hours * 60 + minutes);
}

function getZurichEndOfDayUtc(dateIso: string): Date {
  const [year, month, day] = dateIso.split('-').map((part) => Number.parseInt(part, 10));
  const localWallClockAsUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59);

  // Convert Zurich local 23:59:59 to the matching UTC instant.
  let offsetMinutes = getTimezoneOffsetMinutes(localWallClockAsUtcMs, CFP_TIMEZONE);
  let utcMs = localWallClockAsUtcMs - offsetMinutes * 60 * 1000;

  // Recompute once at corrected instant to handle DST transitions safely.
  offsetMinutes = getTimezoneOffsetMinutes(utcMs, CFP_TIMEZONE);
  utcMs = localWallClockAsUtcMs - offsetMinutes * 60 * 1000;

  return new Date(utcMs);
}

const CFP_CLOSE_DATE = getZurichEndOfDayUtc(CFP_ENDS_DATE_ISO);
const CFP_CLOSES_AT_MS = CFP_CLOSE_DATE.getTime();

export const CFP_MEETUP_CFP_URL = 'https://www.zurichjs.com/cfp?utm_source=conf&utm_medium=confwebsite';
export const CFP_CLOSED_ERROR_CODE = 'CFP_CLOSED';

export function getCfpCloseDate(): Date {
  return new Date(CFP_CLOSE_DATE);
}

export function isCfpClosed(now: Date = new Date()): boolean {
  return now.getTime() >= CFP_CLOSES_AT_MS;
}
