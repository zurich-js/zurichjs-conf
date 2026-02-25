/**
 * CFP Admin Reviewer API
 * GET /api/admin/cfp/reviewers/[id] - Get reviewer with activity stats
 * PUT /api/admin/cfp/reviewers/[id] - Update reviewer (role, access level)
 * DELETE /api/admin/cfp/reviewers/[id] - Revoke reviewer access (deactivate)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateReviewer, deactivateReviewer } from '@/lib/cfp/reviewers';
import { getAdminReviewersWithActivity } from '@/lib/cfp/admin';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Reviewer API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Reviewer ID is required' });
  }

  // GET - Fetch single reviewer with activity data
  if (req.method === 'GET') {
    try {
      const reviewers = await getAdminReviewersWithActivity();
      const reviewer = reviewers.find(r => r.id === id);

      if (!reviewer) {
        return res.status(404).json({ error: 'Reviewer not found' });
      }

      return res.status(200).json({ reviewer });
    } catch (error) {
      log.error('Error fetching reviewer', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT - Update reviewer
  if (req.method === 'PUT') {
    try {
      const { role, can_see_speaker_identity, name } = req.body;

      const updates: {
        name?: string;
        role?: 'super_admin' | 'reviewer' | 'readonly';
        can_see_speaker_identity?: boolean;
      } = {};

      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (can_see_speaker_identity !== undefined) updates.can_see_speaker_identity = can_see_speaker_identity;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const { reviewer, error } = await updateReviewer(id, updates);

      if (error) {
        return res.status(400).json({ error });
      }

      return res.status(200).json({ reviewer });
    } catch (error) {
      log.error('Error updating reviewer', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE - Revoke access (deactivate)
  if (req.method === 'DELETE') {
    try {
      const { success, error } = await deactivateReviewer(id);

      if (error) {
        return res.status(400).json({ error });
      }

      return res.status(200).json({ success });
    } catch (error) {
      log.error('Error deactivating reviewer', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
