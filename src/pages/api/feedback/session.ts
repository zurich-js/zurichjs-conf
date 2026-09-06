/**
 * Public Session Feedback API
 * POST /api/feedback/session — one anonymous rating of a scheduled session.
 *
 * No login: attendees rate straight from /schedule. The guards are therefore
 * all server-side facts rather than trust in the client:
 *  - the schedule item must exist, be visible and be a session (not a break);
 *  - the session must have started, venue time (no feedback on future talks);
 *  - one rating per browser per session, enforced by the table's UNIQUE
 *    constraint on (schedule_item_id, client_id) — the client hides the form
 *    after submitting, but the database is the real gate.
 *
 * The table is service-role only, so the typed service client is used here
 * deliberately: there is no user context to respect.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getScheduleItemStatus, getZurichClock, isFeedbackOpen } from '@/lib/feedback/schedule-status';
import { logger } from '@/lib/logger';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase';
import { sessionFeedbackSchema } from '@/lib/validations/session-feedback';

const log = logger.scope('Session Feedback API');

// Deliberately loose: hundreds of attendees share the venue wifi's one IP and
// will all rate a keynote in the same five minutes. This only brakes a script.
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 120 });

interface SessionFeedbackResponse {
  ok: boolean;
  error?: string;
  code?: 'ALREADY_SUBMITTED' | 'NOT_OPEN' | 'NOT_FOUND';
  issues?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionFeedbackResponse>
): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { allowed } = limiter.check(getClientIp(req));
  if (!allowed) {
    res.status(429).json({ ok: false, error: 'Too many requests' });
    return;
  }

  const parsed = sessionFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { scheduleItemId, clientId, rating, comment } = parsed.data;

  try {
    const supabase = createServiceRoleClient();

    const { data: item, error: itemError } = await supabase
      .from('program_schedule_items')
      .select('id, date, start_time, duration_minutes, type, is_visible, session_id')
      .eq('id', scheduleItemId)
      .maybeSingle();

    if (itemError) {
      log.error('Failed to load schedule item for feedback', itemError, { scheduleItemId });
      res.status(500).json({ ok: false, error: 'Internal server error' });
      return;
    }

    if (!item || !item.is_visible || item.type !== 'session' || !item.session_id) {
      res.status(404).json({ ok: false, error: 'Session not found', code: 'NOT_FOUND' });
      return;
    }

    // Admins previewing the schedule may rate ahead of the clock; everyone
    // else waits until the session has actually started.
    const clock = getZurichClock(new Date());
    const { authorized: isAdmin } = verifyAdminAccess(req);
    if (!isAdmin && !isFeedbackOpen(item, clock)) {
      const status = getScheduleItemStatus(item, clock);
      res.status(403).json({
        ok: false,
        code: 'NOT_OPEN',
        error: status === 'upcoming' ? 'Feedback opens once the session starts' : 'Feedback for this session has closed',
      });
      return;
    }

    const { error: insertError } = await supabase.from('session_feedback').insert({
      schedule_item_id: item.id,
      session_id: item.session_id,
      client_id: clientId,
      rating,
      comment: comment ?? null,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        res.status(409).json({ ok: false, code: 'ALREADY_SUBMITTED', error: 'You have already rated this session' });
        return;
      }
      log.error('Failed to store session feedback', insertError, { scheduleItemId });
      res.status(500).json({ ok: false, error: 'Internal server error' });
      return;
    }

    log.info('Session feedback stored', { scheduleItemId, sessionId: item.session_id, rating, hasComment: Boolean(comment) });
    res.status(201).json({ ok: true });
  } catch (err) {
    log.error('Unexpected error storing session feedback', err, { scheduleItemId });
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
