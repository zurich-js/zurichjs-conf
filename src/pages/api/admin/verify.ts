/**
 * Admin Verify API
 * GET /api/admin/verify
 * Checks if the current user has a valid admin token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Verify');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminToken = req.cookies.admin_token;

    if (!verifyAdminToken(adminToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ authenticated: true });
  } catch (error) {
    log.error('Admin verify error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
