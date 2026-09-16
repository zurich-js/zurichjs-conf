/**
 * Server-side resolution of an unlisted speaker feedback link.
 *
 * Runs on the render path of a URL that anyone holding the link can open, so
 * everything here is scoped down to the one speaker the code resolves to — no
 * other speaker's ratings or comments may reach the response.
 */

import { logger } from '@/lib/logger';
import { getAdminScheduleRows } from '@/lib/program/schedule';
import { createServiceRoleClient } from '@/lib/supabase';
import type { SessionFeedbackRow, SpeakerFeedbackShareData } from '@/lib/types/session-feedback';
import { buildAdminFeedbackResponse, type SpeakerShareLinkBuilder } from './aggregate';
import { selectFeedbackDetail } from './detail';
import { buildSpeakerFeedbackShare, speakerFeedbackCodeMatches } from './share';

const log = logger.scope('Speaker Feedback Share');

/** Raised when the schedule or the feedback rows could not be read. */
export class SpeakerFeedbackShareLoadError extends Error {
  constructor(
    public readonly dataset: 'schedule' | 'feedback',
    cause: string
  ) {
    super(`Failed to load speaker feedback share ${dataset}: ${cause}`);
    this.name = 'SpeakerFeedbackShareLoadError';
  }
}

/** Whether share links can be minted at all in this environment. */
export function areSpeakerFeedbackSharesConfigured(): boolean {
  return Boolean(process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET);
}

/**
 * Builder the admin feedback API hands to the aggregator, or undefined where no
 * signing secret is configured — the admin view still works, just without links.
 */
export function getSpeakerShareLinkBuilder(): SpeakerShareLinkBuilder | undefined {
  if (!areSpeakerFeedbackSharesConfigured()) {
    log.warn('Speaker feedback share links unavailable: no ORDER_TOKEN_SECRET or NEXTAUTH_SECRET');
    return undefined;
  }
  return buildSpeakerFeedbackShare;
}

/** Schedule plus every feedback row, the same two reads the admin overview makes. */
async function loadFeedbackSources(): Promise<{
  items: Awaited<ReturnType<typeof getAdminScheduleRows>>['rows'];
  rows: SessionFeedbackRow[];
}> {
  const supabase = createServiceRoleClient();
  const [{ rows: items, error: scheduleError }, feedbackResult] = await Promise.all([
    getAdminScheduleRows(),
    supabase
      .from('session_feedback')
      .select('id, schedule_item_id, session_id, rating, comment, created_at')
      .order('created_at', { ascending: false }),
  ]);

  if (scheduleError) throw new SpeakerFeedbackShareLoadError('schedule', scheduleError);
  if (feedbackResult.error) throw new SpeakerFeedbackShareLoadError('feedback', feedbackResult.error.message);

  return { items, rows: feedbackResult.data ?? [] };
}

/**
 * Resolve a share code to that speaker's own feedback, or null when the code
 * matches no speaker on the schedule (an old link, a typo, or a guess).
 */
export async function loadSpeakerFeedbackShare(code: string): Promise<SpeakerFeedbackShareData | null> {
  if (!areSpeakerFeedbackSharesConfigured()) return null;

  const { items, rows } = await loadFeedbackSources();
  const overview = buildAdminFeedbackResponse(items, rows);

  const speaker = overview.speakers.find((candidate) => speakerFeedbackCodeMatches(candidate.speakerId, code));
  if (!speaker) return null;

  // selectFeedbackDetail narrows the entries to this speaker's sessions — the
  // rest of the overview is dropped here and never serialised to the page.
  const detail = selectFeedbackDetail(overview, { kind: 'speaker', id: speaker.speakerId });
  if (!detail) return null;

  return {
    speakerName: speaker.name,
    speakerRole: speaker.role,
    speakerImageUrl: speaker.imageUrl,
    detail,
  };
}
