/**
 * Admin Verifications API
 * GET /api/admin/verifications - List verification requests
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Verifications API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();
    const { status } = req.query;

    let query = supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: verifications, error } = await query;

    if (error) {
      log.error('Error fetching verifications', error);
      return res.status(500).json({ error: 'Failed to fetch verifications' });
    }

    return res.status(200).json({ verifications });
  } catch (error) {
    log.error('Admin verifications API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
