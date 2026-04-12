/**
 * Reviewer Shared Submission API
 * GET /api/cfp/reviewer/shared/[token] - Fetch submission via a secure share token
 *
 * Requires the caller to be an authenticated reviewer (any role, including readonly).
 * Returns the full (de-anonymized) submission with speaker info, reviews, and stats.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { getSubmissionForReview } from '@/lib/cfp/reviews';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Reviewer Shared Submission API');

function createCfpServiceClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing share token' });
  }

  try {
    // 1. Authenticate the reviewer
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      log.warn('Authentication failed for shared link', { error: userError?.message });
      return res.status(401).json({ error: 'Unauthorized - please log in' });
    }

    const reviewer = await getReviewerByUserId(user.id);

    if (!reviewer) {
      log.warn('Non-reviewer attempted shared link access', { userId: user.id });
      return res.status(403).json({ error: 'Not authorized as a reviewer' });
    }

    if (!reviewer.accepted_at) {
      return res.status(403).json({ error: 'Invitation not accepted' });
    }

    // 2. Look up the share token using service client (bypasses RLS)
    const serviceClient = createCfpServiceClient();

    const { data: share, error: shareError } = await serviceClient
      .from('cfp_shortlist_shares')
      .select('*')
      .eq('token', token)
      .single();

    if (shareError || !share) {
      log.warn('Invalid share token', { token: token.slice(0, 8) + '...' });
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    // Check if revoked
    if (share.revoked_at) {
      return res.status(410).json({ error: 'This share link has been revoked' });
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired' });
    }

    // 3. Fetch the full submission data (de-anonymized, like super_admin view)
    //    We create a synthetic super_admin reviewer object to get full data,
    //    since the share link is explicitly granting de-anonymized access.
    const superAdminView = {
      ...reviewer,
      role: 'super_admin' as const,
      can_see_speaker_identity: true,
    };

    const { submission, error: submissionError } = await getSubmissionForReview(
      share.submission_id,
      superAdminView
    );

    if (submissionError || !submission) {
      log.warn('Shared submission not found', { submissionId: share.submission_id });
      return res.status(404).json({ error: 'Submission not found' });
    }

    log.info('Shared submission accessed', {
      reviewerEmail: reviewer.email,
      submissionId: share.submission_id,
      token: token.slice(0, 8) + '...',
    });

    return res.status(200).json({
      reviewer,
      submission,
      share: {
        note: share.note,
        created_at: share.created_at,
      },
    });
  } catch (error) {
    log.error('Error fetching shared submission', error, { token: token?.toString().slice(0, 8) + '...' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
