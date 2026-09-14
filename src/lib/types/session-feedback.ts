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

/** What a schedule card hands the feedback hook when the visitor submits. */
export interface SubmitSessionFeedbackInput {
  scheduleItemId: string;
  sessionId: string | null;
  sessionKind: 'talk' | 'workshop' | 'panel' | null;
  sessionStatus: 'live' | 'past';
  rating: number;
  comment: string;
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
  /** Speaker ids in the same order as `speakers`, for cross-referencing the speaker rollup */
  speakerIds: string[];
  responseCount: number;
  /** Mean rating rounded to one decimal, null when there are no responses */
  averageRating: number | null;
  /** Index 0 = one star … index 4 = five stars */
  distribution: [number, number, number, number, number];
}

/** One of a speaker's rateable sessions, with just enough rollup for a list row. */
export interface SpeakerSessionFeedbackRef {
  scheduleItemId: string;
  title: string;
  date: string;
  startTime: string;
  responseCount: number;
  averageRating: number | null;
}

/** Every rating a speaker collected across all the sessions they appeared in. */
export interface SpeakerFeedbackSummary {
  speakerId: string;
  name: string;
  /** `Job title at Company`, whichever parts exist, or null */
  role: string | null;
  imageUrl: string | null;
  sessions: SpeakerSessionFeedbackRef[];
  responseCount: number;
  /** Mean rating across every session, rounded to one decimal, null when there are no responses */
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
  speakers: SpeakerFeedbackSummary[];
  entries: SessionFeedbackFeedEntry[];
  totals: {
    responses: number;
    averageRating: number | null;
    sessionsWithFeedback: number;
  };
}

/** Which rollup a drill-down view is showing. */
export type FeedbackDetailTargetKind = 'session' | 'speaker';

/** What the admin page asks `selectFeedbackDetail` for. */
export interface FeedbackDetailTarget {
  kind: FeedbackDetailTargetKind;
  id: string;
}

/** Everything the per-talk / per-speaker drill-down renders. */
export interface FeedbackDetailView {
  kind: FeedbackDetailTargetKind;
  id: string;
  title: string;
  /** Speakers and room for a talk, job title and company for a speaker */
  subtitle: string | null;
  responseCount: number;
  commentCount: number;
  averageRating: number | null;
  distribution: [number, number, number, number, number];
  /** Per-session breakdown — only populated for a speaker with more than one session */
  sessions: SpeakerSessionFeedbackRef[];
  /** Newest-first entries belonging to this talk, or to every session of this speaker */
  entries: SessionFeedbackFeedEntry[];
}
