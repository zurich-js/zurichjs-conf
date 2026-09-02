/**
 * Door Manual Admit API
 * POST /api/checkin/manual-admit — admit someone without a working code
 *
 * Not a rare fallback. Any attendee who buys after the badge print run gets a
 * blank badge with a hand-written name and no machine-readable code at all, so
 * this is the guaranteed path for a growing segment.
 *
 * Restricted to a lead and requires a reason. Both are enforced again inside
 * door_check_in — the guard here returns the friendlier of the two rejections,
 * but the database is the authority, and its refusal is audited either way.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCheckIn } from '@/lib/checkin/rpc';
import { doorManualAdmitSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorCheckInResult } from '@/lib/types/checkin';

const log = logger.scope('Door Manual Admit API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorCheckInResult | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = await requireDoorStaff(req, res, 'manual_admit');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorManualAdmitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { scannedId, station, occurredAt, occasion, reason } = parsed.data;

  try {
    const result = await doorCheckIn({
      scannedId,
      staffId: guard.staff.id,
      station,
      occurredAt,
      occasion,
      manual: true,
      reason,
    });

    log.info('Manual admission', {
      staffId: guard.staff.id,
      outcome: result.outcome,
      occasion: result.occasion,
    });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Manual admission failed', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not admit that attendee' });
  }
}
