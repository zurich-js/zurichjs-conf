/**
 * Shared helpers for parsing and computing workshop schedule fields.
 * Used by the admin API (PATCH/POST) and the schedule synthesis logic.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export interface ScheduleInput {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface ScheduleValidationError {
  ok: false;
  error: string;
}

export interface ScheduleValidationOk {
  ok: true;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
}

export type ScheduleValidationResult = ScheduleValidationOk | ScheduleValidationError;

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map((part) => Number(part));
  return h * 60 + m;
};

/**
 * Normalize HH:MM or HH:MM:SS to HH:MM:00 so it matches Postgres TIME storage.
 */
const normalizeTime = (time: string): string => {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
};

export function validateSchedule(input: ScheduleInput): ScheduleValidationResult {
  const date = input.date ?? null;
  const startTime = input.startTime ?? null;
  const endTime = input.endTime ?? null;

  if (date && !DATE_RE.test(date)) {
    return { ok: false, error: 'date must be YYYY-MM-DD' };
  }
  if (startTime && !TIME_RE.test(startTime)) {
    return { ok: false, error: 'startTime must be HH:MM' };
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return { ok: false, error: 'endTime must be HH:MM' };
  }

  let durationMinutes: number | null = null;
  if (startTime && endTime) {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (end <= start) {
      return { ok: false, error: 'endTime must be after startTime' };
    }
    durationMinutes = end - start;
  }

  return {
    ok: true,
    date,
    startTime: startTime ? normalizeTime(startTime) : null,
    endTime: endTime ? normalizeTime(endTime) : null,
    durationMinutes,
  };
}

/**
 * Whether this workshop has enough schedule info to appear on a timeline.
 */
export function hasScheduleSlot(workshop: {
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
}): workshop is {
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
} {
  return Boolean(workshop.date && workshop.start_time && workshop.end_time);
}
