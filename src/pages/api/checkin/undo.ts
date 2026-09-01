/**
 * Door Undo Check-In API
 * POST /api/checkin/undo — clear a mistaken check-in for the chosen occasion
 *
 * The correction path for a mis-scan: the wrong person of a pair, or a tap on
 * someone already through. door_check_in_undo clears the per-occasion arrival
 * and writes a `check_in_undone` audit row in the same commit — the trail shows
 * the mistake AND the correction.
 *
 * `duplicate` means "there was nothing to undo", the same already-in-the-
 * desired-state semantics as the other door writes, which is what makes a
 * queued replay safe.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCheckInUndo } from '@/lib/checkin/rpc';
import { doorCheckInUndoSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorCheckInResult } from '@/lib/types/checkin';

const log = logger.scope('Door Undo API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorCheckInResult | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Whoever can check someone in can also un-check them: a mis-scan is fixed
  // at the lane it happened at. The database enforces the same rule again.
  const guard = await requireDoorStaff(req, res, 'check_in');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorCheckInUndoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { scannedId, station, occurredAt, occasion, reason } = parsed.data;

  try {
    const result = await doorCheckInUndo({
      scannedId,
      staffId: guard.staff.id,
      station,
      occurredAt,
      occasion,
      reason,
    });

    log.info('Check-in undone', {
      staffId: guard.staff.id,
      outcome: result.outcome,
      occasion: result.occasion,
    });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Undo failed', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not undo that check-in' });
  }
}
