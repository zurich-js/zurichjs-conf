/**
 * Door Resolve API
 * POST /api/checkin/resolve — the whole attendee panel for one scanned code
 *
 * POST rather than GET, and the id in the body rather than the path, because a
 * ticket UUID is an admission credential: a path segment lands in access logs,
 * referrers and analytics URLs. The existing /validate/[ticketId] route is
 * exactly that mistake.
 *
 * The station normally resolves a scan from its prefetched roster with no
 * request at all. This exists for the cases the roster cannot serve: a code
 * created after the shift started, or a station confirming state before a
 * consequential action.
 */

import { withApiHandler } from '@/lib/api/handler';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorResolve } from '@/lib/checkin/rpc';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { doorScanSchema } from '@/lib/validations/checkin';

export default withApiHandler(
  { scope: 'Door Resolve API', methods: ['POST'], bodySchema: doorScanSchema },
  async (req, res, { requestId, log, body }) => {
    const guard = await requireDoorStaff(req, res, 'lookup');
    if (!guard.ok) {
      throw new HttpError(guard.status, guard.error, {
        code: guard.status === 401 ? ErrorCodes.AUTH_REQUIRED : ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    try {
      const result = await doorResolve(body.scannedId);

      // A miss is 200, not 404: an unknown code is an expected event at a door and
      // the station renders a "not in roster, try the desk" panel for it. A 404
      // would be indistinguishable from the route being wrong.
      return res.status(200).json(result);
    } catch (error) {
      log.error('Failed to resolve a scan', error, { staffId: guard.staff.id });
      return res
        .status(500)
        .json({ error: 'Could not look that code up', code: ErrorCodes.INTERNAL, requestId });
    }
  }
);
