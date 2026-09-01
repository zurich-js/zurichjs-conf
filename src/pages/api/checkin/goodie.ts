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

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorGoodieHandover } from '@/lib/checkin/rpc';
import { doorGoodieHandoverSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorGoodieResult } from '@/lib/types/checkin';

const log = logger.scope('Door Goodie API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorGoodieResult | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = await requireDoorStaff(req, res, 'goodie');
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorGoodieHandoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { ticketId, station, occurredAt, occasion, note, tshirtSize, hoodieSize } = parsed.data;

  try {
    const result = await doorGoodieHandover({
      ticketId,
      staffId: guard.staff.id,
      station,
      occurredAt,
      occasion,
      note,
      // What actually went over the counter, per item. Absent = not handed;
      // recorded on the audit row so missing items can be followed up.
      tshirtSize,
      hoodieSize,
    });

    log.info('Goodie handover', { staffId: guard.staff.id, outcome: result.outcome });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Goodie handover failed', error, { staffId: guard.staff.id });
    return res.status(500).json({ error: 'Could not record that handover' });
  }
}
