/**
 * Admin sponsorship prospectus API.
 * GET /api/admin/sponsorships/prospectus
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { listProspectusAssets } from '@/lib/sponsorship/prospectus';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Sponsorship Prospectus API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const assets = await listProspectusAssets();
    return res.status(200).json({ assets });
  } catch (error) {
    log.error('Failed to list prospectus assets', error);
    return res.status(500).json({ error: 'Failed to list prospectus assets' });
  }
}
