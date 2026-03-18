/**
 * Admin Attendee Analytics API
 * GET /api/admin/attendee-analytics - Get comprehensive attendee analytics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAttendeeAnalytics } from '@/lib/analytics/attendee-analytics';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Attendee Analytics API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const analytics = await getAttendeeAnalytics();
    return res.status(200).json({ analytics });
  } catch (error) {
    log.error('Error fetching attendee analytics', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
