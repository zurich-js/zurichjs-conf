import { getPublicConferenceCalendarUrl, getPublicEngineeringDayCalendarUrl } from '@/lib/calendar/public-events';
import { createEvents, type EventAttributes } from 'ics';
import type { PublicSession } from '@/lib/types/cfp';

function getSessionDurationMinutes(session: PublicSession): number {
  return session.schedule?.duration_minutes ?? (session.type === 'workshop' ? 180 : 30);
}

interface PublicSessionCalendarOptions {
  speakerDetailUrl?: string;
}

type SupportedCalendar = 'google' | 'outlook' | 'ics';

function getPublicSessionCalendarPayload(session: PublicSession, options: PublicSessionCalendarOptions = {}) {
  const date = session.schedule?.date;
  const startTime = session.schedule?.start_time;

  if (!date || !startTime) {
    return null;
  }

  const durationMinutes = getSessionDurationMinutes(session);
  const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
  const start = new Date(`${date}T${normalizedTime}+02:00`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const location = session.schedule?.room ? `Technopark Zurich - ${session.schedule.room}` : 'Technopark Zurich';
  const title = `${session.type === 'workshop' ? 'ZurichJS Workshop' : 'ZurichJS Conf'}: ${session.title}`;
  const description = [
    session.abstract,
    '',
    `Speaker details: ${options.speakerDetailUrl || 'https://conf.zurichjs.com/speakers'}`,
    'TODO: link directly to the dedicated session details page once talk/workshop pages are live.',
  ].join('\n');

  return { start, end, location, title, description };
}

function formatCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function getPublicSessionGoogleCalendarUrl(
  session: PublicSession,
  options: PublicSessionCalendarOptions = {}
): string | null {
  const payload = getPublicSessionCalendarPayload(session, options);

  if (!payload) {
    return null;
  }

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', payload.title);
  url.searchParams.set('details', payload.description);
  url.searchParams.set('location', payload.location);
  url.searchParams.set('dates', `${formatCalendarDate(payload.start)}/${formatCalendarDate(payload.end)}`);

  return url.toString();
}

export function getPublicSessionOutlookCalendarUrl(
  session: PublicSession,
  options: PublicSessionCalendarOptions = {}
): string | null {
  const payload = getPublicSessionCalendarPayload(session, options);

  if (!payload) {
    return null;
  }

  const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  url.searchParams.set('path', '/calendar/action/compose');
  url.searchParams.set('rru', 'addevent');
  url.searchParams.set('subject', payload.title);
  url.searchParams.set('body', payload.description);
  url.searchParams.set('location', payload.location);
  url.searchParams.set('startdt', payload.start.toISOString());
  url.searchParams.set('enddt', payload.end.toISOString());

  return url.toString();
}

export { getPublicConferenceCalendarUrl, getPublicEngineeringDayCalendarUrl };

function downloadIcsFile(filename: string, content: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);

  return true;
}

export function downloadPublicSessionIcs(
  session: PublicSession,
  options: PublicSessionCalendarOptions = {}
): boolean {
  const payload = getPublicSessionCalendarPayload(session, options);

  if (!payload) {
    return false;
  }

  const event: EventAttributes = {
    start: [
      payload.start.getFullYear(),
      payload.start.getMonth() + 1,
      payload.start.getDate(),
      payload.start.getHours(),
      payload.start.getMinutes(),
    ],
    end: [
      payload.end.getFullYear(),
      payload.end.getMonth() + 1,
      payload.end.getDate(),
      payload.end.getHours(),
      payload.end.getMinutes(),
    ],
    title: payload.title,
    description: payload.description,
    location: payload.location,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: {
      name: 'ZurichJS Conference',
      email: 'hello@zurichjs.com',
    },
  };

  const { error, value } = createEvents([event]);
  if (error || !value) {
    return false;
  }

  return downloadIcsFile(`${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`, value);
}

export function addPublicSessionToCalendar(
  session: PublicSession,
  calendar: SupportedCalendar,
  options: PublicSessionCalendarOptions = {}
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (calendar === 'ics') {
    return downloadPublicSessionIcs(session, options);
  }

  const url =
    calendar === 'google'
      ? getPublicSessionGoogleCalendarUrl(session, options)
      : getPublicSessionOutlookCalendarUrl(session, options);

  if (!url) {
    return false;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
