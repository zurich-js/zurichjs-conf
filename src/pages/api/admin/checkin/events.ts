/**
 * Door Audit Log API
 * GET    /api/admin/checkin/events — the audit trail, filtered, newest first
 * DELETE /api/admin/checkin/events — remove named rows (admin cookie only)
 *
 * READ is for oversight (admin or door lead): who did what to whom, when, and
 * why it was refused. Names are joined in for display; emails are not.
 *
 * DELETE exists for rehearsal and test rows. It is deliberately narrower than
 * read: an admin cookie is required (a door lead cannot prune the trail that
 * records their own actions), the bot key is refused because it is read-only by
 * contract, and the database keeps its append-only triggers — the only path
 * through them is door_events_delete, which unlocks its own transaction only.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { requireDoorOversight } from '@/lib/checkin/guard';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { listDoorEvents, type DoorEventRecord } from '@/lib/checkin/events';
import { doorEventsDelete } from '@/lib/checkin/rpc';
import { doorEventQuerySchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';

const log = logger.scope('Door Events API');

export interface DoorEventList {
  events: DoorEventRecord[];
  generatedAt: string;
}

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Nothing to delete').max(200, 'Too many at once'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorEventList | { deleted: number } | { error: string; issues?: unknown }>
) {
  if (req.method === 'GET') {
    const guard = await requireDoorOversight(req, res);
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error });
    }

    const parsed = doorEventQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    }

    try {
      const events = await listDoorEvents(parsed.data);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json({ events, generatedAt: new Date().toISOString() });
    } catch (error) {
      log.error('Failed to list door events', error);
      return res.status(500).json({ error: 'Could not load the audit log' });
    }
  }

  if (req.method === 'DELETE') {
    const { authorized, isBot } = verifyAdminAccess(req);
    if (!authorized || isBot) {
      return res.status(401).json({ error: 'Deleting audit rows needs an admin session' });
    }

    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    }

    try {
      const result = await doorEventsDelete(parsed.data.ids);
      // The ids are already in the request log; repeating them here adds noise,
      // but the count is what an operator greps for after a cleanup.
      log.info('Door events deleted', { requested: parsed.data.ids.length, ...result });
      return res.status(200).json(result);
    } catch (error) {
      log.error('Failed to delete door events', error);
      return res.status(500).json({ error: 'Could not delete those events' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
