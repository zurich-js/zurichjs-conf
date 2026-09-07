/**
 * Roll raw feedback rows up per schedule item for the admin view.
 */

import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type {
  AdminSessionFeedbackResponse,
  SessionFeedbackFeedEntry,
  SessionFeedbackRow,
  SessionFeedbackSummary,
} from '@/lib/types/session-feedback';

/** Round to one decimal place for display. */
function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Mean rating to one decimal, or null when there is nothing to average. */
export function averageRating(rows: Pick<SessionFeedbackRow, 'rating'>[]): number | null {
  if (rows.length === 0) return null;
  const sum = rows.reduce((total, row) => total + row.rating, 0);
  return roundToTenth(sum / rows.length);
}

/** Speaker display names in billing order, skipping entries with no name. */
function speakerNames(item: ProgramScheduleItemRecord): string[] {
  const speakers = item.program_session?.speakers ?? [];
  return [...speakers]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((entry) => [entry.speaker?.first_name, entry.speaker?.last_name].filter(Boolean).join(' ').trim())
    .filter((name) => name.length > 0);
}

/** Collapse program kinds to the three the feedback UI distinguishes (keynotes count as talks). */
function sessionKind(item: ProgramScheduleItemRecord): SessionFeedbackSummary['kind'] {
  const kind = item.program_session?.kind;
  if (kind === 'workshop' || kind === 'panel') return kind;
  if (kind === 'talk' || kind === 'keynote') return 'talk';
  return null;
}

/**
 * Build the admin payload: one summary per session-type schedule item
 * (talks, panels, workshops — breaks and social events can't be rated), in
 * schedule order, plus the newest-first feed of individual entries.
 */
export function buildAdminFeedbackResponse(
  items: ProgramScheduleItemRecord[],
  rows: SessionFeedbackRow[]
): AdminSessionFeedbackResponse {
  const rowsByItem = new Map<string, SessionFeedbackRow[]>();
  for (const row of rows) {
    if (!row.schedule_item_id) continue;
    const bucket = rowsByItem.get(row.schedule_item_id);
    if (bucket) bucket.push(row);
    else rowsByItem.set(row.schedule_item_id, [row]);
  }

  const sessions: SessionFeedbackSummary[] = items
    .filter((item) => item.type === 'session' && item.program_session)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
    .map((item) => {
      const itemRows = rowsByItem.get(item.id) ?? [];
      const distribution: SessionFeedbackSummary['distribution'] = [0, 0, 0, 0, 0];
      for (const row of itemRows) {
        if (row.rating >= 1 && row.rating <= 5) distribution[row.rating - 1] += 1;
      }
      return {
        scheduleItemId: item.id,
        sessionId: item.program_session?.id ?? null,
        title: item.program_session?.title ?? item.title,
        date: item.date,
        startTime: item.start_time,
        durationMinutes: item.duration_minutes,
        room: item.room,
        kind: sessionKind(item),
        speakers: speakerNames(item),
        responseCount: itemRows.length,
        averageRating: averageRating(itemRows),
        distribution,
      };
    });

  const titleByItem = new Map(sessions.map((summary) => [summary.scheduleItemId, summary.title]));
  const entries: SessionFeedbackFeedEntry[] = [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((row) => ({
      ...row,
      sessionTitle: (row.schedule_item_id ? titleByItem.get(row.schedule_item_id) : undefined) ?? 'Removed session',
    }));

  return {
    sessions,
    entries,
    totals: {
      responses: rows.length,
      averageRating: averageRating(rows),
      sessionsWithFeedback: sessions.filter((summary) => summary.responseCount > 0).length,
    },
  };
}
