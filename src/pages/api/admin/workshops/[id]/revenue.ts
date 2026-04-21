/**
 * Admin Workshop Revenue API
 * GET /api/admin/workshops/:id/revenue — confirmed-registration revenue grouped by currency.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getWorkshopRevenue } from '@/lib/workshops';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Workshop Revenue');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Invalid workshop id' });
  }

  try {
    const summary = await getWorkshopRevenue(id);
    return res.status(200).json(summary);
  } catch (error) {
    log.error('Unexpected error loading revenue', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load revenue',
    });
  }
}
