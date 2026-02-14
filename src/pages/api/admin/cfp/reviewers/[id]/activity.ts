/**
 * CFP Admin Reviewer Activity API
 * GET /api/admin/cfp/reviewers/[id]/activity - Get reviewer's review activity
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReviewerActivity } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Reviewer Activity API');

type DateRange = '7d' | '30d' | 'all';

function isValidDateRange(value: unknown): value is DateRange {
  return value === '7d' || value === '30d' || value === 'all';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const reviewerId = req.query.id;
  if (typeof reviewerId !== 'string') {
    return res.status(400).json({ error: 'Invalid reviewer ID' });
  }

  const dateRangeParam = req.query.dateRange;
  const dateRange = isValidDateRange(dateRangeParam) ? dateRangeParam : undefined;

  try {
    const result = await getReviewerActivity(reviewerId, dateRange);
    return res.status(200).json(result);
  } catch (error) {
    log.error('Error fetching reviewer activity', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
