/**
 * Admin Travel Speakers API
 * GET /api/admin/cfp/travel/speakers - Get managed program speakers with travel details
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getManagedSpeakersWithTravel } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Speakers API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const speakers = await getManagedSpeakersWithTravel();
      return res.status(200).json({ speakers });
    } catch (error) {
      log.error('Error fetching speakers with travel', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
