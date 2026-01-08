/**
 * Sponsorship Tiers API
 * GET /api/admin/sponsorships/tiers - List available tiers
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { listTiers } from '@/lib/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Sponsorship Tiers API');

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
    const tiers = await listTiers();
    return res.status(200).json({ tiers });
  } catch (error) {
    log.error('Error listing tiers', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list tiers',
    });
  }
}
