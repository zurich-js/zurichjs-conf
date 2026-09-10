/**
 * Europe/Zurich wall-clock → UTC conversion.
 *
 * The conference stores dates (`YYYY-MM-DD`) and times (`HH:MM[:SS]`) as
 * venue-local wall-clock values without an offset. These helpers turn them
 * into real instants so server-side gates (CFP closure, workshop sales cutoff)
 * behave the same regardless of the server's own timezone.
 */

export const ZURICH_TIMEZONE = 'Europe/Zurich';

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

/**
 * Convert a Zurich-local date + time to the matching UTC instant.
 *
 * @param dateIso `YYYY-MM-DD`
 * @param time    `HH:MM` or `HH:MM:SS` (defaults to midnight)
 */
export function zurichWallClockToUtc(dateIso: string, time: string = '00:00:00'): Date {
  const [year, month, day] = dateIso.split('-').map((part) => Number.parseInt(part, 10));
  const [hours = 0, minutes = 0, seconds = 0] = time
    .split(':')
    .map((part) => Number.parseInt(part, 10));
  const localWallClockAsUtcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);

  // First pass: offset at the wall-clock instant read as if it were UTC.
  let offsetMinutes = getTimezoneOffsetMinutes(localWallClockAsUtcMs, ZURICH_TIMEZONE);
  let utcMs = localWallClockAsUtcMs - offsetMinutes * 60 * 1000;

  // Recompute once at the corrected instant to handle DST transitions safely.
  offsetMinutes = getTimezoneOffsetMinutes(utcMs, ZURICH_TIMEZONE);
  utcMs = localWallClockAsUtcMs - offsetMinutes * 60 * 1000;

  return new Date(utcMs);
}
