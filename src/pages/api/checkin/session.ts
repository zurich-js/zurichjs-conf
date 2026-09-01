/**
 * Door Session API
 * GET /api/checkin/session — who am I, my role, and the active occasion
 *
 * Gates the door UI. Resolves first so the station knows which controls to show
 * before the roster arrives, and so a revoked volunteer is told plainly rather
 * than watching a scan fail.
 */

import { withApiHandler } from '@/lib/api/handler';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCurrentOccasion } from '@/lib/checkin/rpc';
import { ErrorCodes, HttpError } from '@/lib/errors';

export default withApiHandler(
  { scope: 'Door Session API', methods: ['GET'] },
  async (req, res, { requestId, log }) => {
    const guard = await requireDoorStaff(req, res);
    if (!guard.ok) {
      throw new HttpError(guard.status, guard.error, {
        code: guard.status === 401 ? ErrorCodes.AUTH_REQUIRED : ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    try {
      // Read from the database rather than computing here, so the station, the API
      // and the audit trail cannot disagree about which day it is.
      const occasion = await doorCurrentOccasion();
      return res.status(200).json({ staff: guard.staff, occasion });
    } catch (error) {
      log.error('Failed to resolve door session', error, { staffId: guard.staff.id });
      return res
        .status(500)
        .json({ error: 'Could not start the door session', code: ErrorCodes.INTERNAL, requestId });
    }
  }
);
