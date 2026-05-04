/**
 * Admin Speaker Accommodation API
 * PUT /api/admin/cfp/travel/speakers/[id]/accommodation - Upsert accommodation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { setSpeakerAccommodation } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Speaker Accommodation API');

const accommodationSchema = z.object({
  hotel_name: z.string().optional(),
  hotel_address: z.string().optional(),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  reservation_number: z.string().optional(),
  reservation_confirmation_url: z.string().optional(),
  cost_amount: z.number().optional(),
  cost_currency: z.string().optional(),
  is_covered_by_conference: z.boolean().optional(),
  admin_notes: z.string().optional(),
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
      const parsed = accommodationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const { accommodation, error } = await setSpeakerAccommodation(id, parsed.data);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Accommodation updated', { speakerId: id });
      return res.status(200).json({ accommodation });
    } catch (error) {
      log.error('Error updating accommodation', error, { speakerId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
