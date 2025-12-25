/**
 * CFP Admin Submissions API
 * GET /api/admin/cfp/submissions - List all submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSubmissions } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';
import type { CfpSubmissionStatus, CfpSubmissionType, CfpTalkLevel } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Submissions API');

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
    const {
      status,
      submission_type,
      talk_level,
      search,
      sort_by,
      sort_order,
      limit,
      offset,
    } = req.query;

    const { submissions, total } = await getAdminSubmissions({
      status: status ? (status as CfpSubmissionStatus) : undefined,
      submission_type: submission_type ? (submission_type as CfpSubmissionType) : undefined,
      talk_level: talk_level ? (talk_level as CfpTalkLevel) : undefined,
      search: search as string | undefined,
      sort_by: sort_by as 'created_at' | 'avg_score' | 'review_count' | 'title' | undefined,
      sort_order: sort_order as 'asc' | 'desc' | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    return res.status(200).json({ submissions, total });
  } catch (error) {
    log.error('Error fetching submissions', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
