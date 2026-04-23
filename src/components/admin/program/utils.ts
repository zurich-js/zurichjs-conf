import type { Workshop } from '@/lib/types/database';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { ProgramSession } from '@/lib/types/program';
import type { SpeakerWithSessions } from '@/components/admin/speakers';

export type ProgramSessionFilter = 'all' | 'scheduled' | 'unscheduled' | 'missing-speakers' | 'missing-profile' | 'commerce-ready';

export interface ProgramScheduleDayGroup {
  date: string;
  label: string;
  items: ProgramScheduleItemRecord[];
}

export interface ProgramScheduleNeighborResult {
  previous: ProgramScheduleItemRecord | null;
  next: ProgramScheduleItemRecord | null;
  overlaps: ProgramScheduleItemRecord[];
}

export interface ScheduleSlotDraft {
  date: string;
  start_time: string;
  room?: string | null;
}

export function getSessionScheduleCount(session: ProgramSession, scheduleItems: ProgramScheduleItemRecord[]) {
  return scheduleItems.filter((item) =>
    item.session_id === session.id ||
    (session.cfp_submission_id && item.submission_id === session.cfp_submission_id)
  ).length;
}

export function getSessionSpeakers(session: ProgramSession, speakers: SpeakerWithSessions[]) {
  const byId = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  return (session.speakers ?? [])
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .map((assignment) => byId.get(assignment.speaker_id))
    .filter((speaker): speaker is SpeakerWithSessions => Boolean(speaker));
}

export function hasMissingSpeakerProfile(session: ProgramSession, speakers: SpeakerWithSessions[]) {
  const assignedSpeakers = getSessionSpeakers(session, speakers);
  if (assignedSpeakers.length === 0) return true;

  return assignedSpeakers.some((speaker) =>
    !speaker.first_name?.trim() ||
    !speaker.last_name?.trim() ||
    !speaker.job_title?.trim() ||
    !speaker.company?.trim() ||
    !speaker.bio?.trim() ||
    !speaker.profile_image_url?.trim()
  );
}

export function isWorkshopCommerceReady(offering: Workshop | null | undefined) {
  if (!offering) return false;
  const metadata = offering.metadata;
  const validation = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata.stripeValidation as { valid?: boolean } | undefined
    : undefined;

  return Boolean(
    offering.status === 'published' &&
    offering.stripe_product_id &&
    offering.stripe_price_lookup_key &&
    validation?.valid === true
  );
}

export function filterProgramSessions(
  sessions: ProgramSession[],
  filter: ProgramSessionFilter,
  scheduleItems: ProgramScheduleItemRecord[],
  speakers: SpeakerWithSessions[],
  offeringsBySessionId: Map<string, Workshop | null>
) {
  return sessions.filter((session) => {
    if (filter === 'scheduled') return getSessionScheduleCount(session, scheduleItems) > 0;
    if (filter === 'unscheduled') return getSessionScheduleCount(session, scheduleItems) === 0;
    if (filter === 'missing-speakers') return (session.speakers ?? []).length === 0;
    if (filter === 'missing-profile') return hasMissingSpeakerProfile(session, speakers);
    if (filter === 'commerce-ready') return session.kind === 'workshop' && isWorkshopCommerceReady(offeringsBySessionId.get(session.id));
    return true;
  });
}

export function matchesProgramSearch(session: ProgramSession, search: string, speakers: SpeakerWithSessions[]) {
  const value = search.trim().toLowerCase();
  if (!value) return true;

  const speakerNames = getSessionSpeakers(session, speakers)
    .map((speaker) => `${speaker.first_name} ${speaker.last_name}`)
    .join(' ');

  return [
    session.title,
    session.abstract ?? '',
    session.kind,
    session.status,
    speakerNames,
  ].some((entry) => entry.toLowerCase().includes(value));
}

export function getScheduleSortValue(item: Pick<ProgramScheduleItemRecord, 'date' | 'start_time' | 'room'>) {
  return `${item.date} ${item.start_time} ${item.room ?? ''}`;
}

export function sortScheduleItems(items: ProgramScheduleItemRecord[]) {
  return items.slice().sort((left, right) => getScheduleSortValue(left).localeCompare(getScheduleSortValue(right)));
}

export function formatScheduleDayLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export function groupScheduleItemsByDay(items: ProgramScheduleItemRecord[]): ProgramScheduleDayGroup[] {
  const groups = new Map<string, ProgramScheduleItemRecord[]>();

  for (const item of sortScheduleItems(items)) {
    const existing = groups.get(item.date) ?? [];
    existing.push(item);
    groups.set(item.date, existing);
  }

  return Array.from(groups.entries()).map(([date, groupedItems]) => ({
    date,
    label: formatScheduleDayLabel(date),
    items: groupedItems,
  }));
}

export function timeToMinutes(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function minutesToTime(minutes: number) {
  const normalized = Math.max(0, minutes);
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
  const mins = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

export function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function getScheduleRange(item: Pick<ProgramScheduleItemRecord, 'start_time' | 'duration_minutes'>) {
  const start = timeToMinutes(item.start_time);
  return {
    start,
    end: start + item.duration_minutes,
  };
}

export function inferScheduleDurationForSession(session: ProgramSession | null | undefined) {
  if (!session) return 30;
  if (session.kind === 'workshop' && session.workshop_duration_minutes) return session.workshop_duration_minutes;

  const legacyType = typeof session.metadata?.legacy_submission_type === 'string'
    ? session.metadata.legacy_submission_type
    : null;

  if (legacyType === 'lightning') return 20;
  if (legacyType === 'standard' || session.kind === 'talk' || session.kind === 'panel' || session.kind === 'keynote') return 35;
  return 30;
}

export function scheduleItemsOverlap(left: ProgramScheduleItemRecord, right: ProgramScheduleItemRecord) {
  if (left.id === right.id || left.date !== right.date || left.room !== right.room) return false;
  const leftRange = getScheduleRange(left);
  const rightRange = getScheduleRange(right);
  return leftRange.start < rightRange.end && rightRange.start < leftRange.end;
}

export function getScheduleNeighbors(item: ProgramScheduleItemRecord, items: ProgramScheduleItemRecord[]): ProgramScheduleNeighborResult {
  const sameTrack = sortScheduleItems(items).filter((candidate) =>
    candidate.id !== item.id &&
    candidate.date === item.date &&
    candidate.room === item.room
  );
  const itemRange = getScheduleRange(item);
  const overlaps = sameTrack.filter((candidate) => scheduleItemsOverlap(item, candidate));
  const previous = sameTrack
    .filter((candidate) => getScheduleRange(candidate).end <= itemRange.start)
    .at(-1) ?? null;
  const next = sameTrack.find((candidate) => getScheduleRange(candidate).start >= itemRange.end) ?? null;

  return { previous, next, overlaps };
}

export function getInsertionDraftAfter(
  previous: ProgramScheduleItemRecord | null,
  fallbackDate: string,
  fallbackStartTime = '09:00'
): ScheduleSlotDraft {
  if (!previous) {
    return {
      date: fallbackDate,
      start_time: fallbackStartTime,
      room: null,
    };
  }

  return {
    date: previous.date,
    start_time: addMinutesToTime(previous.start_time, previous.duration_minutes),
    room: previous.room,
  };
}

export function getInsertionDraftBefore(
  next: ProgramScheduleItemRecord | null,
  fallbackDate: string,
  fallbackStartTime = '09:00'
): ScheduleSlotDraft {
  if (!next) {
    return {
      date: fallbackDate,
      start_time: fallbackStartTime,
      room: null,
    };
  }

  const nextStart = timeToMinutes(next.start_time);
  const defaultStart = timeToMinutes(fallbackStartTime);

  return {
    date: next.date,
    start_time: minutesToTime(nextStart < defaultStart ? nextStart - 30 : defaultStart),
    room: next.room,
  };
}
