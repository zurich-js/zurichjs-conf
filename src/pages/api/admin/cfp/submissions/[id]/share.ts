/**
 * CFP Admin Share Link API
 * POST /api/admin/cfp/submissions/[id]/share - Generate a secure share link for a submission
 *
 * Creates a cryptographic token stored in cfp_shortlist_shares, returning a URL
 * that authenticated reviewers can use to view the full (de-anonymized) submission.
 */

import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Share Link API');

function createCfpServiceClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createCfpServiceClient();

    // Verify submission exists
    const { data: submission, error: fetchError } = await supabase
      .from('cfp_submissions')
      .select('id, title')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Generate a cryptographically secure token
    const token = crypto.randomBytes(32).toString('base64url');

    const { note } = req.body || {};

    // Store share record
    const { error: insertError } = await supabase
      .from('cfp_shortlist_shares')
      .insert({
        submission_id: id,
        token,
        created_by: 'admin',
        note: note || null,
      });

    if (insertError) {
      log.error('Error creating share link', insertError, { submissionId: id });
      return res.status(500).json({ error: 'Failed to create share link' });
    }

    const baseUrl = getBaseUrl(req);
    const url = `${baseUrl}/cfp/reviewer/shared/${token}`;

    log.info('Share link created', { submissionId: id, token: token.slice(0, 8) + '...' });

    return res.status(200).json({ token, url });
  } catch (error) {
    log.error('Error generating share link', error, { submissionId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
