import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

export const communityDayMeetup = {
  agendaUrl: 'https://zurichjs.com/events/sep-2026',
  rsvpUrl: 'https://www.meetup.com/zurich-js/events/315488367/',
} as const;

export const warmupChillRun = {
  location: 'Technoparkstrasse 1, Zürich',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Technoparkstrasse%201%2C%20Z%C3%BCrich',
  rsvpUrl: 'https://atmo.rsvp/p/jyc.dev/e/3mqmpqpn37sio',
  hostName: '@jyc.dev',
  hostUrl: 'https://bsky.app/profile/jyc.dev',
} as const;

/**
 * Static schedule-list entry for the chill run. Merged into the DB-driven
 * schedule on the workshop-day tab and sorted by start time, so it lands
 * after the afternoon workshops and before the speakers dinner.
 */
export const warmupChillRunScheduleItem: PublicProgramScheduleItem = {
  id: 'warmup-chill-run',
  date: '2026-09-10',
  start_time: '17:00:00',
  duration_minutes: 60,
  room: null,
  type: 'event',
  title: 'Official ZurichJS Chill Run',
  description:
    'A fun, easy ~5K close to the conference venue — not a race. Everyone is welcome, no matter your level. Just bring your sneakers and good vibes!',
  submission_id: null,
  is_visible: true,
  session: null,
  speaker: null,
  speakers: [],
  session_kind: null,
};

export const publicProgramTabs = [
  { id: 'community', label: 'Community day', date: 'September 9, 2026', sessionDate: null },
  { id: 'warmup', label: 'Workshop day', date: 'September 10, 2026', sessionDate: '2026-09-10' },
  { id: 'conference', label: 'Conference day', date: 'September 11, 2026', sessionDate: '2026-09-11' },
  { id: 'post-conference', label: 'Post-conf day', date: 'September 12, 2026', sessionDate: null },
] as const;

export const workshopProgramSections = [
  { id: 'morning', label: 'Morning sessions', date: '09:00 - 13:00', start: '09:00', duration: 240 },
  { id: 'lunch', label: 'Lunch break', date: '13:00 - 14:00' },
  { id: 'afternoon', label: 'Afternoon sessions', date: '14:00 - 18:00', start: '14:00', duration: 240 },
] as const;

export const workshopSlotCount = 3;
