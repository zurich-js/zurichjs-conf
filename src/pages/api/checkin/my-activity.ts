/**
 * Door My Activity API
 * GET /api/checkin/my-activity — what THIS volunteer has done, newest first
 *
 * Backs the station's "my check-ins" view: a volunteer mid-shift asking "did I
 * already do that person?" or "how many have I let in?". Scoped hard to the
 * authenticated staff id — the query parameter cannot name someone else — so a
 * scanner sees exactly their own trail and nothing about the rest of the crew.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { listDoorEvents, type DoorEventRecord } from '@/lib/checkin/events';
import type { DoorOccasion } from '@/lib/types/checkin';
import { occasionQuerySchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';

const log = logger.scope('Door My Activity API');

export interface DoorMyActivity {
  events: DoorEventRecord[];
  generatedAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorMyActivity | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = await requireDoorStaff(req, res);
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const requested = typeof req.query.occasion === 'string' ? req.query.occasion : undefined;
  const occasion = occasionQuerySchema.parse(requested) as DoorOccasion | undefined;

  try {
    const events = await listDoorEvents({
      staffId: guard.staff.id,
      occasion,
      limit: 200,
    });

    // Attendee names ride along, so this must never sit in a shared cache.
    res.setHeader('Cache-Control', 'private, no-store');

    return res.status(200).json({ events, generatedAt: new Date().toISOString() });
  } catch (error) {
    log.error('Failed to list own door activity', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not load your check-ins' });
  }
}
