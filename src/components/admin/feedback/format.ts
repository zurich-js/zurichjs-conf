import type { SessionFeedbackSummary } from '@/lib/feedback/types';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich',
  hour: '2-digit',
  minute: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** `HH:MM` venue time of an ISO instant; falls back to the raw string. */
export function formatFeedbackTime(iso: string): string {
  try {
    return timeFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** `Thu 14:05`-style stamp for the live feed. */
export function formatFeedbackStamp(iso: string): string {
  try {
    return dateTimeFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** `09:00` from a `HH:MM:SS` schedule start time. */
export function formatScheduleStart(startTime: string): string {
  const [hours = '00', minutes = '00'] = startTime.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

export const KIND_LABELS: Record<NonNullable<SessionFeedbackSummary['kind']>, string> = {
  talk: 'Talk',
  workshop: 'Workshop',
  panel: 'Panel',
};

/** Tailwind text colour for an average — quick visual triage in the table. */
export function ratingTone(average: number | null): string {
  if (average === null) return 'text-gray-400';
  if (average >= 4.5) return 'text-green-700';
  if (average >= 3.5) return 'text-black';
  if (average >= 2.5) return 'text-amber-700';
  return 'text-brand-red';
}
