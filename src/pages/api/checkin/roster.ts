/**
 * Door Roster API
 * GET /api/checkin/roster — the prefetch a station makes once per shift
 *
 * This is the request that makes every subsequent scan free. It is deliberately
 * large and deliberately rare: the station holds the result in memory for the
 * life of the tab and resolves scans from it with no network at all.
 *
 * It is NOT cached at the edge. The payload is the entire attendee list, so a
 * shared cache would serve one volunteer's roster to whoever asked next.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { buildDoorRoster, type DoorRoster } from '@/lib/checkin/roster';
import { doorCurrentOccasion } from '@/lib/checkin/rpc';
import { logger } from '@/lib/logger';

const log = logger.scope('Door Roster API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorRoster | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = await requireDoorStaff(req, res, 'lookup');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  try {
    const occasion = await doorCurrentOccasion();
    const roster = await buildDoorRoster(occasion);

    // Attendee PII must never sit in a shared cache, and a station that asks
    // again wants fresh state rather than a proxy's copy.
    res.setHeader('Cache-Control', 'private, no-store');

    log.info('Roster served', {
      staffId: guard.staff.id,
      occasion,
      tickets: roster.tickets.length,
      registrations: roster.registrations.length,
    });

    return res.status(200).json(roster);
  } catch (error) {
    log.error('Failed to build the roster', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not load the roster' });
  }
}
