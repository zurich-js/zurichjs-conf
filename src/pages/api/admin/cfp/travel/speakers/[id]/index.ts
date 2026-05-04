/**
 * Admin Speaker Travel Details API
 * GET /api/admin/cfp/travel/speakers/[id] - Get single speaker's full travel details
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSpeakerTravelDetails } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Speaker Travel Details API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Speaker ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const speaker = await getSpeakerTravelDetails(id);
      if (!speaker) {
        return res.status(404).json({ error: 'Speaker not found' });
      }

      return res.status(200).json({ speaker });
    } catch (error) {
      log.error('Error fetching speaker travel details', error, { speakerId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
