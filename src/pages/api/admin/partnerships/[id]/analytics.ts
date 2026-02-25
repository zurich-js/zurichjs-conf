/**
 * Partnership Analytics API
 * GET /api/admin/partnerships/[id]/analytics - Get detailed analytics for a partnership
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getPartnershipAnalytics } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipAnalyticsAPI');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid partnership ID' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    log.info('Fetching partnership analytics', { partnershipId: id });

    const analytics = await getPartnershipAnalytics(id);

    if (!analytics) {
      return res.status(404).json({ error: 'Partnership not found' });
    }

    log.info('Partnership analytics fetched successfully', {
      partnershipId: id,
      ticketCount: analytics.tickets.total,
      couponCount: analytics.coupons.total,
      voucherCount: analytics.vouchers.total,
    });

    return res.status(200).json(analytics);
  } catch (error) {
    log.error('Failed to fetch partnership analytics', error, {
      type: 'system',
      severity: 'medium',
      code: 'ANALYTICS_FETCH_ERROR',
      partnershipId: id,
    });

    return res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
