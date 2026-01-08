/**
 * Sponsorship Stats API
 * GET /api/admin/sponsorships/stats - Get sponsorship statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getSponsorshipStats } from '@/lib/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Sponsorship Stats API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await getSponsorshipStats();
    return res.status(200).json(stats);
  } catch (error) {
    log.error('Error fetching sponsorship stats', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch sponsorship stats',
    });
  }
}
