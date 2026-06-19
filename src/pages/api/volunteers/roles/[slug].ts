/**
 * Public Volunteer Role Detail API
 * GET: Returns a single published role by slug
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getRoleBySlug } from '@/lib/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Public Volunteer Role API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' });
  }

  try {
    const { data, error } = await getRoleBySlug(slug);

    if (error || !data) {
      return res.status(404).json({ error: error || 'Role not found' });
    }

    return res.status(200).json({ role: data });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
