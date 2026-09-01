/**
 * Door Session API
 * GET /api/checkin/session — who am I, my role, and the active occasion
 *
 * Gates the door UI. Resolves first so the station knows which controls to show
 * before the roster arrives, and so a revoked volunteer is told plainly rather
 * than watching a scan fail.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCurrentOccasion } from '@/lib/checkin/rpc';
import { logger } from '@/lib/logger';
import type { DoorSession } from '@/lib/types/checkin';

const log = logger.scope('Door Session API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorSession | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = await requireDoorStaff(req, res);
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  try {
    // Read from the database rather than computing here, so the station, the API
    // and the audit trail cannot disagree about which day it is.
    const occasion = await doorCurrentOccasion();
    return res.status(200).json({ staff: guard.staff, occasion });
  } catch (error) {
    log.error('Failed to resolve door session', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not start the door session' });
  }
}
