/**
 * Door Goodie Handover API
 * POST /api/checkin/goodie — record that swag was handed over
 *
 * A separate action from check-in on purpose. Handing over a t-shirt costs
 * roughly 3.5s of door service time, and moving it to its own table removes more
 * from the critical path than any software change — so it has its own role, its
 * own screen and its own endpoint.
 *
 * Keyed on the ticket. Entitlement follows the conference ticket, so a
 * workshop-only attendee has no ticket to pass in and cannot reach this at all;
 * and a person holding both a ticket and a workshop seat has exactly one ticket,
 * which is what makes "two lanes both hand over" impossible.
 */

import { withApiHandler } from '@/lib/api/handler';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorGoodieHandover } from '@/lib/checkin/rpc';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { doorGoodieHandoverSchema } from '@/lib/validations/checkin';

export default withApiHandler(
  { scope: 'Door Goodie API', methods: ['POST'], bodySchema: doorGoodieHandoverSchema },
  async (req, res, { requestId, log, body }) => {
    const guard = await requireDoorStaff(req, res, 'goodie');
    if (!guard.ok) {
      throw new HttpError(guard.status, guard.error, {
        code: guard.status === 401 ? ErrorCodes.AUTH_REQUIRED : ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    const { ticketId, station, occurredAt, note } = body;

    try {
      const result = await doorGoodieHandover({
        ticketId,
        staffId: guard.staff.id,
        station,
        occurredAt,
        note,
      });

      log.info('Goodie handover', { staffId: guard.staff.id, outcome: result.outcome });

      return res.status(200).json(result);
    } catch (error) {
      log.error('Goodie handover failed', error, { staffId: guard.staff.id });
      return res
        .status(500)
        .json({ error: 'Could not record that handover', code: ErrorCodes.INTERNAL, requestId });
    }
  }
);
