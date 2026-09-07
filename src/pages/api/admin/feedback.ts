/**
 * Admin Session Feedback API
 * GET /api/admin/feedback — every rating attendees have submitted, rolled up
 * per session (count, average, star distribution) plus a newest-first feed of
 * the individual entries so organisers can watch comments arrive live.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { buildAdminFeedbackResponse } from '@/lib/feedback/aggregate';
import type { AdminSessionFeedbackResponse, SessionFeedbackRow } from '@/lib/feedback/types';
import { logger } from '@/lib/logger';
import { getAdminScheduleRows } from '@/lib/program/schedule';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Admin Feedback API');

/** GET /api/admin/feedback — admin-only rolled-up feedback overview. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminSessionFeedbackResponse | { error: string }>
): Promise<void> {
  // Free-text comments about named speakers — never let a browser or CDN keep a copy
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const supabase = createServiceRoleClient();
    const [{ rows: items, error: scheduleError }, feedbackResult] = await Promise.all([
      getAdminScheduleRows(),
      supabase
        .from('session_feedback')
        .select('id, schedule_item_id, session_id, rating, comment, created_at')
        .order('created_at', { ascending: false }),
    ]);

    if (scheduleError) {
      log.error('Failed to load schedule for feedback overview', new Error(scheduleError), { operation: 'load_schedule' });
      res.status(500).json({ error: 'Failed to load schedule' });
      return;
    }

    if (feedbackResult.error) {
      log.error('Failed to load session feedback', feedbackResult.error, { operation: 'load_session_feedback' });
      res.status(500).json({ error: 'Failed to load feedback' });
      return;
    }

    const rows: SessionFeedbackRow[] = feedbackResult.data ?? [];
    res.status(200).json(buildAdminFeedbackResponse(items, rows));
  } catch (err) {
    log.error('Unexpected error building feedback overview', err, { operation: 'build_feedback_overview' });
    res.status(500).json({ error: 'Internal server error' });
  }
}
