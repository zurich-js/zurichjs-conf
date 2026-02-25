/**
 * CFP Admin Reviewers API
 * GET /api/admin/cfp/reviewers - List all reviewers
 * GET /api/admin/cfp/reviewers?withActivity=true - List reviewers with activity metrics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminReviewers, getAdminReviewersWithActivity } from '@/lib/cfp/admin';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Reviewers API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const withActivity = req.query.withActivity === 'true';

    if (withActivity) {
      const reviewers = await getAdminReviewersWithActivity();
      return res.status(200).json({ reviewers });
    }

    const reviewers = await getAdminReviewers();
    return res.status(200).json({ reviewers });
  } catch (error) {
    log.error('Error fetching reviewers', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
