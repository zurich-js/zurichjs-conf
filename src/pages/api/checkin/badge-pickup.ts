/**
 * Door Badge Pickup API
 * POST /api/checkin/badge-pickup — record that the physical badge was handed over
 *
 * Exists for early pickup: badges can be collected on the community day before
 * the workshops, and collecting one must NOT consume the next morning's
 * check-in. This writes a `badge_pickup` audit event and nothing else — the
 * applied event row IS the pickup state, so a re-scan reports `duplicate` with
 * the original time.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorBadgePickup } from '@/lib/checkin/rpc';
import { doorBadgePickupSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorBadgePickupResult } from '@/lib/types/checkin';

const log = logger.scope('Door Badge Pickup API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorBadgePickupResult | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Every role may hand a badge over: pickup moves no admission state, and the
  // pre-event desk is staffed by whoever is around that day.
  const guard = await requireDoorStaff(req, res, 'badge_pickup');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorBadgePickupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { scannedId, station, occurredAt, occasion } = parsed.data;

  try {
    const result = await doorBadgePickup({
      scannedId,
      staffId: guard.staff.id,
      station,
      occurredAt,
      occasion,
    });

    log.info('Badge pickup', { staffId: guard.staff.id, outcome: result.outcome });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Badge pickup failed', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not record that badge pickup' });
  }
}
