/**
 * CFP Admin Reviewers API
 * GET /api/admin/cfp/reviewers - List all reviewers
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminReviewers } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const reviewers = await getAdminReviewers();
    return res.status(200).json({ reviewers });
  } catch (error) {
    console.error('[CFP Admin Reviewers API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
