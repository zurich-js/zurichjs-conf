/**
 * Pick a single talk or speaker out of the admin feedback payload and shape it
 * for the drill-down view: headline rollup plus every entry that belongs to it.
 */

import type {
  AdminSessionFeedbackResponse,
  FeedbackDetailTarget,
  FeedbackDetailView,
  SessionFeedbackFeedEntry,
} from '@/lib/types/session-feedback';
import { KIND_LABELS } from './labels';

/** Entries belonging to any of `itemIds`, keeping the payload's newest-first order. */
function entriesForItems(entries: SessionFeedbackFeedEntry[], itemIds: Set<string>): SessionFeedbackFeedEntry[] {
  return entries.filter((entry) => entry.schedule_item_id !== null && itemIds.has(entry.schedule_item_id));
}

/**
 * Resolve the selected talk or speaker against the latest payload. Returns null
 * when the target no longer exists — a session can disappear from the schedule
 * between two polls while its drill-down is open.
 */
export function selectFeedbackDetail(
  data: AdminSessionFeedbackResponse,
  target: FeedbackDetailTarget
): FeedbackDetailView | null {
  if (target.kind === 'session') {
    const session = data.sessions.find((summary) => summary.scheduleItemId === target.id);
    if (!session) return null;

    const entries = entriesForItems(data.entries, new Set([session.scheduleItemId]));
    const subtitle = [
      session.kind ? KIND_LABELS[session.kind] : 'Session',
      session.speakers.length > 0 ? session.speakers.join(', ') : null,
      session.room,
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      kind: 'session',
      id: session.scheduleItemId,
      title: session.title,
      subtitle: subtitle || null,
      responseCount: session.responseCount,
      commentCount: entries.filter((entry) => entry.comment).length,
      averageRating: session.averageRating,
      distribution: session.distribution,
      sessions: [],
      entries,
    };
  }

  const speaker = data.speakers.find((summary) => summary.speakerId === target.id);
  if (!speaker) return null;

  const entries = entriesForItems(data.entries, new Set(speaker.sessions.map((session) => session.scheduleItemId)));

  return {
    kind: 'speaker',
    id: speaker.speakerId,
    title: speaker.name,
    subtitle: speaker.role,
    responseCount: speaker.responseCount,
    commentCount: entries.filter((entry) => entry.comment).length,
    averageRating: speaker.averageRating,
    distribution: speaker.distribution,
    sessions: speaker.sessions,
    entries,
  };
}
