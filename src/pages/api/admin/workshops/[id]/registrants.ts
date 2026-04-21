/**
 * Admin Workshop Registrants API
 * GET /api/admin/workshops/:id/registrants — list registrants for a workshop,
 * enriched with profile info and coupon/voucher codes for discount reporting.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getRegistrantsForAdmin } from '@/lib/workshops';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Workshop Registrants');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Invalid workshop id' });
  }

  try {
    const result = await getRegistrantsForAdmin(id);
    if (!result.success) {
      return res.status(500).json({ error: result.error ?? 'Failed to load registrants' });
    }
    return res.status(200).json({ registrants: result.registrants ?? [] });
  } catch (error) {
    log.error('Unexpected error loading registrants', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load registrants',
    });
  }
}
