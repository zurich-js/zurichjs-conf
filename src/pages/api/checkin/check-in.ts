/**
 * Door Check-In API
 * POST /api/checkin/check-in — admit an attendee for the current occasion
 *
 * One database call. door_check_in authorises, applies the conditional update
 * and writes the audit row in a single commit, so there is no read-then-write
 * pair for two stations to race.
 *
 * A `duplicate` outcome is a 200, not an error. The station must be able to say
 * "already checked in at 09:14" — the response is what authorises releasing a
 * goodie bag, so reporting a second success is how someone gets two.
 */

import { withApiHandler } from '@/lib/api/handler';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCheckIn } from '@/lib/checkin/rpc';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { doorCheckInSchema } from '@/lib/validations/checkin';

export default withApiHandler(
  { scope: 'Door Check-In API', methods: ['POST'], bodySchema: doorCheckInSchema },
  async (req, res, { requestId, log, body }) => {
    const guard = await requireDoorStaff(req, res, 'check_in');
    if (!guard.ok) {
      throw new HttpError(guard.status, guard.error, {
        code: guard.status === 401 ? ErrorCodes.AUTH_REQUIRED : ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    const { scannedId, station, occurredAt } = body;

    try {
      const result = await doorCheckIn({
        scannedId,
        staffId: guard.staff.id,
        station,
        occurredAt,
      });

      // Every outcome — including denied and not_found — is already recorded in
      // door_events by the function, so there is nothing to log for the audit
      // trail here. This line is operational telemetry only.
      log.info('Door check-in', {
        staffId: guard.staff.id,
        outcome: result.outcome,
        occasion: result.occasion,
      });

      return res.status(200).json(result);
    } catch (error) {
      // The door message is deliberate — keep it, but carry the request id so a
      // volunteer's screenshot pins the exact trace.
      log.error('Check-in failed', error, { staffId: guard.staff.id });
      return res
        .status(500)
        .json({ error: 'Could not check that attendee in', code: ErrorCodes.INTERNAL, requestId });
    }
  }
);
