/**
 * Admin Travel Stats API
 * GET /api/admin/cfp/travel/stats - Get travel dashboard statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getTravelDashboardStats } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Stats API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const stats = await getTravelDashboardStats();
      return res.status(200).json(stats);
    } catch (error) {
      log.error('Error fetching travel stats', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
