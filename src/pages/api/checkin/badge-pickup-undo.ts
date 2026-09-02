/**
 * Door Badge Pickup Undo API
 * POST /api/checkin/badge-pickup-undo — take back a mistaken badge handover
 *
 * The correction for tapping the button on the wrong person. Appends a
 * `badge_pickup_undone` audit event; the badge state readers follow the latest
 * event, so the badge can be handed over again afterwards. `duplicate` means
 * there was no pickup to undo, which is what makes a queued replay safe.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorBadgePickupUndo } from '@/lib/checkin/rpc';
import { doorBadgePickupUndoSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorBadgePickupResult } from '@/lib/types/checkin';

const log = logger.scope('Door Badge Pickup Undo API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorBadgePickupResult | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Whoever can hand a badge over can also take the record back: the mistake
  // is fixed at the desk it happened at, whatever the role.
  const guard = await requireDoorStaff(req, res, 'badge_pickup');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorBadgePickupUndoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { scannedId, station, occurredAt, occasion, reason } = parsed.data;

  try {
    const result = await doorBadgePickupUndo({
      scannedId,
      staffId: guard.staff.id,
      station,
      occurredAt,
      occasion,
      reason,
    });

    log.info('Badge pickup undone', { staffId: guard.staff.id, outcome: result.outcome });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Badge pickup undo failed', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not undo that badge pickup' });
  }
}
