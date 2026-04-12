interface PublicCalendarEvent {
  title: string;
  details: string;
  location: string;
  startIso: string;
  endIso: string;
}

function formatCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function getPublicCalendarUrl(event: PublicCalendarEvent): string {
  const start = new Date(event.startIso);
  const end = new Date(event.endIso);
  const url = new URL('https://calendar.google.com/calendar/render');

  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', event.title);
  url.searchParams.set('details', event.details);
  url.searchParams.set('location', event.location);
  url.searchParams.set('dates', `${formatCalendarDate(start)}/${formatCalendarDate(end)}`);

  return url.toString();
}

function openPublicCalendarEvent(event: PublicCalendarEvent): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  window.open(getPublicCalendarUrl(event), '_blank', 'noopener,noreferrer');
  return true;
}

const PUBLIC_CONFERENCE_EVENT: PublicCalendarEvent = {
  title: 'ZurichJS Conference 2026',
  details: 'Join ZurichJS Conference 2026 for a day of JavaScript talks, workshops, and community in Zurich.',
  location: 'Technopark Zurich, Technoparkstrasse 1, 8005 Zurich, Switzerland',
  startIso: '2026-09-11T09:00:00+02:00',
  endIso: '2026-09-11T17:00:00+02:00',
};

const PUBLIC_ENGINEERING_DAY_EVENT: PublicCalendarEvent = {
  title: 'Zurich Engineering Day 2026',
  details: 'Join Zurich Engineering Day for workshops, hands-on sessions, and community programming at Technopark Zurich.',
  location: 'Technopark Zurich, Technoparkstrasse 1, 8005 Zurich, Switzerland',
  startIso: '2026-09-10T09:00:00+02:00',
  endIso: '2026-09-10T18:00:00+02:00',
};

export function getPublicConferenceCalendarUrl(): string {
  return getPublicCalendarUrl(PUBLIC_CONFERENCE_EVENT);
}

export function addPublicConferenceToCalendar(): boolean {
  return openPublicCalendarEvent(PUBLIC_CONFERENCE_EVENT);
}

export function getPublicEngineeringDayCalendarUrl(): string {
  return getPublicCalendarUrl(PUBLIC_ENGINEERING_DAY_EVENT);
}

export function addPublicEngineeringDayToCalendar(): boolean {
  return openPublicCalendarEvent(PUBLIC_ENGINEERING_DAY_EVENT);
}
