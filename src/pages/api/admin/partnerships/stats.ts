/**
 * Partnership Statistics API
 * GET /api/admin/partnerships/stats - Get partnership statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getPartnershipStats } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipStatsAPI');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await getPartnershipStats();
    return res.status(200).json(stats);
  } catch (error) {
    log.error('Error fetching partnership stats', error as Error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch stats',
    });
  }
}
