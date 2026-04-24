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

interface ScheduleNeighborOptions {
  sameRoomOnly?: boolean;
}

export interface ProgramScheduleOverlapLayoutItem {
  item: ProgramScheduleItemRecord;
  rowStart: number;
  rowSpan: number;
  colStart: number;
  colSpan: number;
}

export interface ProgramScheduleDisplayGroup {
  totalColumns: number;
  rows: Array<{
    start_time: string;
    itemsStarting: ProgramScheduleItemRecord[];
  }>;
  start_time: string;
  layout: ProgramScheduleOverlapLayoutItem[];
}

export interface ScheduleSlotDraft {
  date: string;
  start_time: string;
  room?: string | null;
}

const DEFAULT_SLOT_GAP_MINUTES = 5;

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

  if (legacyType === 'lightning') return 15;
  if (legacyType === 'standard' || session.kind === 'talk' || session.kind === 'panel' || session.kind === 'keynote') return 30;
  return 30;
}

export function scheduleItemsOverlap(
  left: ProgramScheduleItemRecord,
  right: ProgramScheduleItemRecord,
  options: ScheduleNeighborOptions = {}
) {
  const { sameRoomOnly = true } = options;
  if (left.id === right.id || left.date !== right.date) return false;
  if (sameRoomOnly && left.room !== right.room) return false;
  const leftRange = getScheduleRange(left);
  const rightRange = getScheduleRange(right);
  return leftRange.start < rightRange.end && rightRange.start < leftRange.end;
}

export function getScheduleNeighbors(
  item: ProgramScheduleItemRecord,
  items: ProgramScheduleItemRecord[],
  options: ScheduleNeighborOptions = {}
): ProgramScheduleNeighborResult {
  const { sameRoomOnly = true } = options;
  const sameTrack = sortScheduleItems(items).filter((candidate) =>
    candidate.id !== item.id &&
    candidate.date === item.date &&
    (!sameRoomOnly || candidate.room === item.room)
  );
  const itemRange = getScheduleRange(item);
  const overlaps = sameTrack.filter((candidate) => scheduleItemsOverlap(item, candidate, { sameRoomOnly }));
  const previous = sameTrack
    .filter((candidate) => getScheduleRange(candidate).end <= itemRange.start)
    .at(-1) ?? null;
  const next = sameTrack.find((candidate) => getScheduleRange(candidate).start >= itemRange.end) ?? null;

  return { previous, next, overlaps };
}

function getInsertionGapMinutes(
  previous: ProgramScheduleItemRecord | null,
  next: ProgramScheduleItemRecord | null
) {
  if (!previous) return 0;
  if (previous.type === 'break' || next?.type === 'break') return 0;
  return DEFAULT_SLOT_GAP_MINUTES;
}

export function getInsertionDraftAfter(
  previous: ProgramScheduleItemRecord | null,
  next: ProgramScheduleItemRecord | null,
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
    start_time: addMinutesToTime(
      previous.start_time,
      previous.duration_minutes + getInsertionGapMinutes(previous, next)
    ),
    room: previous.room ?? next?.room ?? null,
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

export function groupOverlappingScheduleItems(items: ProgramScheduleItemRecord[]) {
  const sorted = sortScheduleItems(items);
  const distinctStartTimes = Array.from(new Set(sorted.map((item) => item.start_time))).sort((left, right) => left.localeCompare(right));
  const rowIndexByStartTime = new Map(distinctStartTimes.map((startTime, index) => [startTime, index]));
  const rows = distinctStartTimes.map((start_time) => ({
    start_time,
    itemsStarting: sorted.filter((item) => item.start_time === start_time),
  }));

  const itemMeta = sorted.map((item) => {
    const rowStart = rowIndexByStartTime.get(item.start_time) ?? 0;
    const range = getScheduleRange(item);
    const activeRowIndexes = distinctStartTimes.reduce<number[]>((acc, startTime, index) => {
      const startMinutes = timeToMinutes(startTime);
      if (range.start <= startMinutes && startMinutes < range.end) {
        acc.push(index);
      }
      return acc;
    }, []);

    return {
      item,
      rowStart,
      rowSpan: activeRowIndexes.length || 1,
      rowEndExclusive: (activeRowIndexes.at(-1) ?? rowStart) + 1,
    };
  });

  const maxConcurrent = distinctStartTimes.reduce((max, startTime) => {
    const startMinutes = timeToMinutes(startTime);
    const activeCount = sorted.filter((item) => {
      const range = getScheduleRange(item);
      return range.start <= startMinutes && startMinutes < range.end;
    }).length;
    return Math.max(max, activeCount);
  }, 1);
  const totalColumns = Math.max(3, maxConcurrent);

  const multiRowMeta = itemMeta
    .filter((meta) => meta.rowSpan > 1)
    .sort((left, right) => {
      if (left.rowStart !== right.rowStart) return left.rowStart - right.rowStart;
      return right.rowSpan - left.rowSpan;
    });

  const occupiedUntil = Array<number>(totalColumns).fill(0);
  const columnById = new Map<string, number>();

  for (const meta of multiRowMeta) {
    let assignedColumn = 0;
    while (assignedColumn < totalColumns && occupiedUntil[assignedColumn] > meta.rowStart) {
      assignedColumn += 1;
    }

    if (assignedColumn >= totalColumns) {
      assignedColumn = totalColumns - 1;
    }

    occupiedUntil[assignedColumn] = meta.rowEndExclusive;
    columnById.set(meta.item.id, assignedColumn + 1);
  }

  const layout: ProgramScheduleOverlapLayoutItem[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const rowItems = itemMeta.filter((meta) => meta.rowStart === rowIndex);
    const activeMultiColumns = new Set<number>(
      itemMeta
        .filter((meta) => meta.rowSpan > 1 && meta.rowStart <= rowIndex && rowIndex < meta.rowEndExclusive)
        .map((meta) => columnById.get(meta.item.id))
        .filter((column): column is number => Boolean(column))
    );

    const singleRowItems = rowItems.filter((meta) => meta.rowSpan === 1);
    const multiRowStartingItems = rowItems.filter((meta) => meta.rowSpan > 1);

    for (const meta of multiRowStartingItems) {
      layout.push({
        item: meta.item,
        rowStart: meta.rowStart + 1,
        rowSpan: meta.rowSpan,
        colStart: columnById.get(meta.item.id) ?? 1,
        colSpan: 1,
      });
    }

    if (singleRowItems.length === 0) {
      continue;
    }

    const occupiedColumns = new Set<number>(activeMultiColumns);
    const freeColumns = Array.from({ length: totalColumns }, (_, index) => index + 1).filter((column) => !occupiedColumns.has(column));

    if (occupiedColumns.size === 0 && singleRowItems.length === 1) {
      layout.push({
        item: singleRowItems[0].item,
        rowStart: rowIndex + 1,
        rowSpan: 1,
        colStart: 1,
        colSpan: totalColumns,
      });
      continue;
    }

    let nextColumn = freeColumns[0] ?? 1;

    singleRowItems.forEach((meta, index) => {
      const remainingItems = singleRowItems.length - index;
      const remainingColumns = totalColumns - nextColumn + 1;
      const colSpan = Math.max(1, Math.floor(remainingColumns / remainingItems));

      layout.push({
        item: meta.item,
        rowStart: rowIndex + 1,
        rowSpan: 1,
        colStart: nextColumn,
        colSpan: index === singleRowItems.length - 1 ? remainingColumns : colSpan,
      });

      nextColumn += index === singleRowItems.length - 1 ? remainingColumns : colSpan;
    });
  }

  return {
    totalColumns,
    rows,
    start_time: rows[0]?.start_time ?? '09:00',
    layout,
  };
}
