/**
 * Admin Speaker Travel Settings API
 * PUT /api/admin/cfp/travel/speakers/[id]/travel - Update travel budget/confirmation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { updateSpeakerTravelAdmin } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Speaker Travel API');

const travelSchema = z.object({
  flight_budget_amount: z.number().optional(),
  flight_budget_currency: z.string().optional(),
  travel_confirmed: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Speaker ID is required' });
  }

  if (req.method === 'PUT') {
    try {
      const parsed = travelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const { success, error } = await updateSpeakerTravelAdmin(id, parsed.data);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Speaker travel updated', { speakerId: id });
      return res.status(200).json({ success });
    } catch (error) {
      log.error('Error updating speaker travel', error, { speakerId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
