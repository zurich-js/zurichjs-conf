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

import { withApiHandler } from '@/lib/api/handler';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCheckIn } from '@/lib/checkin/rpc';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { doorManualAdmitSchema } from '@/lib/validations/checkin';

export default withApiHandler(
  { scope: 'Door Manual Admit API', methods: ['POST'], bodySchema: doorManualAdmitSchema },
  async (req, res, { requestId, log, body }) => {
    const guard = await requireDoorStaff(req, res, 'manual_admit');
    if (!guard.ok) {
      throw new HttpError(guard.status, guard.error, {
        code: guard.status === 401 ? ErrorCodes.AUTH_REQUIRED : ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    const { scannedId, station, occurredAt, reason } = body;

    try {
      const result = await doorCheckIn({
        scannedId,
        staffId: guard.staff.id,
        station,
        occurredAt,
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
      return res
        .status(500)
        .json({ error: 'Could not admit that attendee', code: ErrorCodes.INTERNAL, requestId });
    }
  }
);
