/**
 * Door Staff Teardown API
 * POST /api/admin/checkin/staff/deactivate-all — revoke the whole crew
 *
 * The step after the event that always gets skipped, so it is one action rather
 * than fifteen. Deliberately manual: no scheduled job runs it, because the
 * organisers asked for an admin to own the teardown.
 *
 * Audit rows are unaffected — this only flips is_active.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { deactivateAllStaff } from '@/lib/checkin/staff';
import { logger } from '@/lib/logger';

const log = logger.scope('Door Staff Teardown API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ deactivated: number } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { count, error } = await deactivateAllStaff();
  if (error) {
    return res.status(500).json({ error: 'Could not revoke the crew' });
  }

  log.info('Door crew deactivated', { count });
  return res.status(200).json({ deactivated: count });
}
