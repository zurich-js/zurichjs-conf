/**
 * Admin Reimbursement Status API
 * PUT /api/admin/cfp/travel/reimbursements/[id]/status - Update reimbursement status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateReimbursementStatus } from '@/lib/cfp/admin-travel';
import { verifyAdminToken } from '@/lib/admin/auth';
import type { CfpReimbursementStatus } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Reimbursement Status API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Reimbursement ID is required' });
  }

  if (req.method === 'PUT') {
    try {
      const { status, admin_notes } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const validStatuses: CfpReimbursementStatus[] = ['pending', 'approved', 'rejected', 'paid'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Use a placeholder reviewer ID since we don't have proper admin user IDs
      const reviewerId = 'admin';

      const { success, error } = await updateReimbursementStatus(id, reviewerId, status, admin_notes);

      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Reimbursement status updated', { reimbursementId: id, status });
      return res.status(200).json({ success });
    } catch (error) {
      log.error('Error updating reimbursement status', error, { reimbursementId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
