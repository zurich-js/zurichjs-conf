/**
 * CFP Admin Insights API
 * GET /api/admin/cfp/insights - Get CFP insights and statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCfpInsights } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Insights API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const insights = await getCfpInsights();
    return res.status(200).json({ insights });
  } catch (error) {
    log.error('Error fetching CFP insights', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
