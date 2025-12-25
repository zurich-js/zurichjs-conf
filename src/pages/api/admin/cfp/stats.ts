/**
 * CFP Admin Stats API
 * GET /api/admin/cfp/stats - Get CFP statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCfpStats } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Stats API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats = await getCfpStats();
    return res.status(200).json(stats);
  } catch (error) {
    log.error('Error fetching CFP stats', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
