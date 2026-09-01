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

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCheckIn } from '@/lib/checkin/rpc';
import { doorCheckInSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorCheckInResult } from '@/lib/types/checkin';

const log = logger.scope('Door Check-In API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorCheckInResult | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = await requireDoorStaff(req, res, 'check_in');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorCheckInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { scannedId, station, occurredAt, occasion } = parsed.data;

  try {
    const result = await doorCheckIn({
      scannedId,
      staffId: guard.staff.id,
      station,
      occurredAt,
      // The volunteer's deliberate day choice, already narrowed to the enum by
      // the schema. Absent, the database falls back to its own clock.
      occasion,
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
    log.error('Check-in failed', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not check that attendee in' });
  }
}
