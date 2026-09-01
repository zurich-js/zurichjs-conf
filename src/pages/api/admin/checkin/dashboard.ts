/**
 * Door Dashboard API
 * GET /api/admin/checkin/dashboard — the polled live view
 *
 * POLLING COST IS THE WHOLE DESIGN
 * This is the one endpoint that gets called on a timer, so it is deliberately
 * the cheapest thing in the feature: a single door_dashboard() call returning a
 * fixed sub-2KB object. Grouping per station and per volunteer happens in
 * Postgres rather than by shipping door_events rows to the browser.
 *
 * For scale: at a 10-second interval one viewer would issue 720 requests over a
 * two-hour door. That is why the client polls at 30s by default, why this route
 * never touches the roster, and why nothing here invalidates a TanStack key —
 * invalidateQueries refetches active observers immediately, so pointing a poll
 * at the roster key would refetch the entire attendee list on every tick.
 *
 * Counts and timestamps only. No attendee names or emails cross this boundary,
 * so a dashboard left open on a laptop at the registration desk is not a PII
 * exposure.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorOversight } from '@/lib/checkin/guard';
import { doorDashboard } from '@/lib/checkin/dashboard';
import { DOOR_OCCASIONS, type DoorOccasion } from '@/lib/types/checkin';
import { logger } from '@/lib/logger';
import type { DoorDashboard } from '@/lib/checkin/dashboard';

const log = logger.scope('Door Dashboard API');

function parseOccasion(value: unknown): DoorOccasion | undefined {
  return typeof value === 'string' && (DOOR_OCCASIONS as readonly string[]).includes(value)
    ? (value as DoorOccasion)
    : undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorDashboard | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // An admin cookie OR a door lead: an organiser watching the queue may be on a
  // laptop in the admin panel or on a phone at the door.
  const guard = await requireDoorOversight(req, res);
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  try {
    // Omitted means "whatever the server thinks today is", which is what a lead
    // wants; an explicit occasion is for reviewing the other day afterwards.
    const dashboard = await doorDashboard(parseOccasion(req.query.occasion));

    // Never cached: a stale poll response is worse than no dashboard, because it
    // makes a stalled door look like a moving one.
    res.setHeader('Cache-Control', 'private, no-store');

    return res.status(200).json(dashboard);
  } catch (error) {
    log.error('Failed to build the door dashboard', error);
    return res.status(500).json({ error: 'Could not load the dashboard' });
  }
}
