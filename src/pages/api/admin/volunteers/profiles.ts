/**
 * Admin Volunteer Profiles API
 * GET: List all profiles
 * POST: Create a new profile (from application or manually)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getProfiles, createProfile, createProfileFromApplication } from '@/lib/volunteer';
import { volunteerProfileSchema } from '@/lib/validations/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Volunteer Profiles API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await getProfiles();
      if (error) return res.status(500).json({ error });
      return res.status(200).json({ profiles: data });
    }

    if (req.method === 'POST') {
      // If application_id is provided alone, create from application
      if (req.body.from_application_id && Object.keys(req.body).length === 1) {
        const { data, error } = await createProfileFromApplication(req.body.from_application_id);
        if (error) return res.status(400).json({ error });

        log.info('Profile created from application', { profileId: data?.id });
        return res.status(201).json({ profile: data });
      }

      // Otherwise, create manually
      const parsed = volunteerProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      const { data, error } = await createProfile(parsed.data);
      if (error) return res.status(400).json({ error });

      log.info('Profile created manually', { profileId: data?.id });
      return res.status(201).json({ profile: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
