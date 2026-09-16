/**
 * Roll raw feedback rows up per schedule item for the admin view.
 */

import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type {
  AdminSessionFeedbackResponse,
  SessionFeedbackFeedEntry,
  SessionFeedbackRow,
  SessionFeedbackSummary,
  SpeakerFeedbackShare,
  SpeakerFeedbackSummary,
} from '@/lib/types/session-feedback';

/** Mints the unlisted share link for a speaker; omitted where no signing secret is available. */
export type SpeakerShareLinkBuilder = (speakerId: string, name: string) => SpeakerFeedbackShare | null;

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

type SpeakerLink = NonNullable<NonNullable<ProgramScheduleItemRecord['program_session']>['speakers']>[number];

/** Full name of a linked speaker, empty when neither name part is set. */
function speakerName(link: SpeakerLink): string {
  return [link.speaker?.first_name, link.speaker?.last_name].filter(Boolean).join(' ').trim();
}

/** `Job title at Company`, whichever parts exist, or null. */
function speakerRole(link: SpeakerLink): string | null {
  const { job_title: jobTitle, company } = link.speaker ?? {};
  if (jobTitle && company) return `${jobTitle} at ${company}`;
  return jobTitle || company || null;
}

/** Speaker links in billing order, skipping entries with no name to show. */
function billedSpeakers(item: ProgramScheduleItemRecord): SpeakerLink[] {
  const speakers = item.program_session?.speakers ?? [];
  return [...speakers]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .filter((link) => speakerName(link).length > 0);
}

/** Star counts, index 0 = one star … index 4 = five stars. */
function ratingDistribution(rows: Pick<SessionFeedbackRow, 'rating'>[]): SessionFeedbackSummary['distribution'] {
  const distribution: SessionFeedbackSummary['distribution'] = [0, 0, 0, 0, 0];
  for (const row of rows) {
    if (row.rating >= 1 && row.rating <= 5) distribution[row.rating - 1] += 1;
  }
  return distribution;
}

/** Collapse program kinds to the three the feedback UI distinguishes (keynotes count as talks). */
function sessionKind(item: ProgramScheduleItemRecord): SessionFeedbackSummary['kind'] {
  const kind = item.program_session?.kind;
  if (kind === 'workshop' || kind === 'panel') return kind;
  if (kind === 'talk' || kind === 'keynote') return 'talk';
  return null;
}

/**
 * Roll the per-session summaries up per speaker, so a speaker on two talks has
 * one row covering both. Ordered by response count, then alphabetically.
 */
function buildSpeakerSummaries(
  items: ProgramScheduleItemRecord[],
  sessions: SessionFeedbackSummary[],
  rowsByItem: Map<string, SessionFeedbackRow[]>,
  shareLinkFor?: SpeakerShareLinkBuilder
): SpeakerFeedbackSummary[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const speakers = new Map<string, SpeakerFeedbackSummary>();
  const rowsBySpeaker = new Map<string, SessionFeedbackRow[]>();

  // Walk the already-sorted summaries so each speaker's sessions stay in schedule order
  for (const summary of sessions) {
    const item = itemById.get(summary.scheduleItemId);
    if (!item) continue;

    for (const link of billedSpeakers(item)) {
      const existing = speakers.get(link.speaker_id);
      const speaker = existing ?? {
        speakerId: link.speaker_id,
        name: speakerName(link),
        role: speakerRole(link),
        imageUrl: link.speaker?.profile_image_url ?? null,
        sessions: [],
        responseCount: 0,
        averageRating: null,
        distribution: [0, 0, 0, 0, 0] as SpeakerFeedbackSummary['distribution'],
        share: shareLinkFor?.(link.speaker_id, speakerName(link)) ?? null,
      };
      if (!existing) speakers.set(link.speaker_id, speaker);

      speaker.sessions.push({
        scheduleItemId: summary.scheduleItemId,
        title: summary.title,
        date: summary.date,
        startTime: summary.startTime,
        responseCount: summary.responseCount,
        averageRating: summary.averageRating,
      });
      speaker.responseCount += summary.responseCount;

      const bucket = rowsBySpeaker.get(link.speaker_id) ?? [];
      bucket.push(...(rowsByItem.get(summary.scheduleItemId) ?? []));
      rowsBySpeaker.set(link.speaker_id, bucket);
    }
  }

  return [...speakers.values()]
    .map((speaker) => {
      const speakerRows = rowsBySpeaker.get(speaker.speakerId) ?? [];
      return {
        ...speaker,
        averageRating: averageRating(speakerRows),
        distribution: ratingDistribution(speakerRows),
      };
    })
    .sort((a, b) => b.responseCount - a.responseCount || a.name.localeCompare(b.name));
}

/**
 * Build the admin payload: one summary per session-type schedule item
 * (talks, panels, workshops — breaks and social events can't be rated), in
 * schedule order, the same ratings rolled up per speaker, plus the
 * newest-first feed of individual entries.
 */
export function buildAdminFeedbackResponse(
  items: ProgramScheduleItemRecord[],
  rows: SessionFeedbackRow[],
  shareLinkFor?: SpeakerShareLinkBuilder
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
      const speakers = billedSpeakers(item);
      return {
        scheduleItemId: item.id,
        sessionId: item.program_session?.id ?? null,
        title: item.program_session?.title ?? item.title,
        date: item.date,
        startTime: item.start_time,
        durationMinutes: item.duration_minutes,
        room: item.room,
        kind: sessionKind(item),
        speakers: speakers.map(speakerName),
        speakerIds: speakers.map((link) => link.speaker_id),
        responseCount: itemRows.length,
        averageRating: averageRating(itemRows),
        distribution: ratingDistribution(itemRows),
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
    speakers: buildSpeakerSummaries(items, sessions, rowsByItem, shareLinkFor),
    entries,
    totals: {
      responses: rows.length,
      averageRating: averageRating(rows),
      sessionsWithFeedback: sessions.filter((summary) => summary.responseCount > 0).length,
    },
  };
}
