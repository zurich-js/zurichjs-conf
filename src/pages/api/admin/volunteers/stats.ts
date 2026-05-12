/**
 * Admin Volunteer Stats API
 * GET: Overview statistics for the volunteer dashboard
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { logger } from '@/lib/logger';
import type { VolunteerStats } from '@/lib/types/volunteer';

const log = logger.scope('Admin Volunteer Stats API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createCfpServiceClient();

    const [rolesResult, applicationsResult, profilesResult] = await Promise.all([
      supabase
        .from('volunteer_roles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published'),
      supabase
        .from('volunteer_applications')
        .select('status'),
      supabase
        .from('volunteer_profiles')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_confirmation', 'confirmed', 'active']),
    ]);

    const applications = applicationsResult.data || [];
    const pendingReview = applications.filter(
      (a: { status: string }) => a.status === 'submitted' || a.status === 'in_review',
    ).length;
    const accepted = applications.filter(
      (a: { status: string }) => a.status === 'accepted',
    ).length;

    const stats: VolunteerStats = {
      open_roles: rolesResult.count || 0,
      total_applications: applications.length,
      pending_review: pendingReview,
      accepted,
      team_size: profilesResult.count || 0,
    };

    return res.status(200).json({ stats });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
