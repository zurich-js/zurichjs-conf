/**
 * CFP Admin Update Submission Status API
 * PUT /api/admin/cfp/submissions/[id]/status - Update submission status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateSubmissionStatus } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';
import type { CfpSubmissionStatus } from '@/lib/types/cfp';

const VALID_STATUSES: CfpSubmissionStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'shortlisted',
  'waitlisted',
  'accepted',
  'rejected',
  'withdrawn',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const { success, error } = await updateSubmissionStatus(id, status);

    if (!success) {
      return res.status(400).json({ error: error || 'Failed to update status' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CFP Admin Status API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
