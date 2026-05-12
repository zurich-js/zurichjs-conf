/**
 * Admin Volunteer Applications API
 * GET: List applications with optional filters
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getApplications } from '@/lib/volunteer';
import type { VolunteerApplicationStatus } from '@/lib/types/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Volunteer Applications API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, role_id, search } = req.query;

    const { data, error } = await getApplications({
      status: status as VolunteerApplicationStatus | undefined,
      role_id: role_id as string | undefined,
      search: search as string | undefined,
    });

    if (error) return res.status(500).json({ error });

    return res.status(200).json({ applications: data });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
