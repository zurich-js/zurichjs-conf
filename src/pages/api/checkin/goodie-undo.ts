/**
 * Door Goodie Undo API
 * POST /api/checkin/goodie-undo — take back a mistaken goodie handover, per item
 *
 * Undoing the t-shirt leaves the hoodie handed and vice versa. Clearing any
 * item also clears the full-entitlement stamp, so the next handover call can
 * complete the record again. `duplicate` means nothing was handed, which is
 * what makes a queued replay safe.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorGoodieUndo } from '@/lib/checkin/rpc';
import { doorGoodieUndoSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorGoodieUndoResult } from '@/lib/types/checkin';

const log = logger.scope('Door Goodie Undo API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorGoodieUndoResult | { error: string; issues?: unknown }>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // The same ability that records a handover can take one back.
  const guard = await requireDoorStaff(req, res, 'goodie');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorGoodieUndoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { ticketId, station, occurredAt, occasion, reason, undoTshirt, undoHoodie } = parsed.data;

  try {
    const result = await doorGoodieUndo({
      ticketId,
      staffId: guard.staff.id,
      station,
      occurredAt,
      occasion,
      reason,
      undoTshirt,
      undoHoodie,
    });

    log.info('Goodie handover undone', { staffId: guard.staff.id, outcome: result.outcome });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Goodie undo failed', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not undo that handover' });
  }
}
