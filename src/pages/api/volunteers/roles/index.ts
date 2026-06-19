/**
 * Public Volunteer Roles API
 * GET: Returns all published, public volunteer roles
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublishedRoles } from '@/lib/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Public Volunteer Roles API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await getPublishedRoles();

    if (error) {
      log.error('Failed to fetch published roles', null, { error });
      return res.status(500).json({ error });
    }

    return res.status(200).json({ roles: data });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
