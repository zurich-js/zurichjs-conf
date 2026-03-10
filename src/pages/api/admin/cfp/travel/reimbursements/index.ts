/**
 * Admin Travel Reimbursements API
 * GET /api/admin/cfp/travel/reimbursements - Get all reimbursements with speaker info
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllReimbursements } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';
import type { CfpReimbursementStatus } from '@/lib/types/cfp';

const log = logger.scope('Admin Travel Reimbursements API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const status = req.query.status as CfpReimbursementStatus | undefined;

      const reimbursements = await getAllReimbursements(status ? { status } : undefined);
      return res.status(200).json({ reimbursements });
    } catch (error) {
      log.error('Error fetching reimbursements', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
