/**
 * Admin Verification Rejection API
 * POST /api/admin/verifications/[id]/reject
 *
 * Rejects a student/unemployed verification request.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Verification Reject');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Verification ID is required' });
    }

    const supabase = createServiceRoleClient();

    // Fetch the verification request
    const { data: verification, error: fetchError } = await supabase
      .from('verification_requests')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !verification) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        error: `Verification is already ${verification.status}`,
      });
    }

    const { error: updateError } = await supabase
      .from('verification_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      log.error('Failed to reject verification', updateError, { id });
      return res.status(500).json({ error: 'Failed to reject verification' });
    }

    log.info('Verification rejected', { id });

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Failed to reject verification', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
