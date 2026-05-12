/**
 * Admin Volunteer Profile Detail API
 * GET: Get profile by ID
 * PUT: Update profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getProfileById, updateProfile } from '@/lib/volunteer';
import { volunteerProfileSchema } from '@/lib/validations/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Volunteer Profile API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Profile ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await getProfileById(id);
      if (error) return res.status(404).json({ error });
      return res.status(200).json({ profile: data });
    }

    if (req.method === 'PUT') {
      const parsed = volunteerProfileSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      const { data, error } = await updateProfile(id, parsed.data);
      if (error) return res.status(400).json({ error });
      return res.status(200).json({ profile: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
