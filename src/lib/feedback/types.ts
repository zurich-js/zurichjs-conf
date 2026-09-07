/**
 * Session feedback domain types.
 *
 * Attendees rate talks, panels and workshops from the public /schedule page
 * while the conference is running; organisers watch the results arrive on
 * /admin/feedback. Everything is anonymous — see the migration comment on
 * `session_feedback.client_id`.
 */

/** Where a schedule item sits relative to the venue clock. */
export type ScheduleItemLiveStatus = 'upcoming' | 'live' | 'past';

/** The `day` query param values on /schedule. */
export type ScheduleDayParam = 'community' | 'workshop' | 'conf';

/** Venue-local date + time-of-day, derived from a UTC instant. */
export interface ZurichClock {
  /** `YYYY-MM-DD` in Europe/Zurich */
  date: string;
  /** Minutes since local midnight in Europe/Zurich */
  minutesOfDay: number;
}

/** The subset of a schedule item that status calculation needs. */
export interface ScheduleTiming {
  date: string;
  /** `HH:MM` or `HH:MM:SS` */
  start_time: string;
  duration_minutes: number;
}

export interface SessionFeedbackInput {
  scheduleItemId: string;
  clientId: string;
  rating: number;
  comment?: string;
}

/**
 * What the browser keeps after a submission. `rating` is null when the server
 * reported the browser had already rated this session (a 409) and the
 * original rating is unknown here.
 */
export interface StoredSessionFeedback {
  rating: number | null;
  comment: string | null;
  submittedAt: string;
}

export interface SessionFeedbackRow {
  id: string;
  /** Null once the schedule item has been deleted — the row is kept as an audit trail */
  schedule_item_id: string | null;
  session_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** One session on the schedule, with its feedback rolled up. */
export interface SessionFeedbackSummary {
  scheduleItemId: string;
  sessionId: string | null;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  room: string | null;
  kind: 'talk' | 'workshop' | 'panel' | null;
  speakers: string[];
  responseCount: number;
  /** Mean rating rounded to one decimal, null when there are no responses */
  averageRating: number | null;
  /** Index 0 = one star … index 4 = five stars */
  distribution: [number, number, number, number, number];
}

/** A single feedback entry as shown in the admin live feed. */
export interface SessionFeedbackFeedEntry extends SessionFeedbackRow {
  sessionTitle: string;
}

export interface AdminSessionFeedbackResponse {
  sessions: SessionFeedbackSummary[];
  entries: SessionFeedbackFeedEntry[];
  totals: {
    responses: number;
    averageRating: number | null;
    sessionsWithFeedback: number;
  };
}
