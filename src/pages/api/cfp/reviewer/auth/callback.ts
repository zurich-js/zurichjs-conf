/**
 * Reviewer Auth Callback API
 * POST /api/cfp/reviewer/auth/callback - Accept reviewer invitation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, acceptReviewerInvite } from '@/lib/cfp/auth';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';

const log = logger.scope('CFP Reviewer Auth Callback');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let userId: string;
  let userEmail: string;

  // Try to get user from Supabase session first
  const supabase = createSupabaseApiClient(req, res);
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (user && user.email) {
    // Got user from session
    userId = user.id;
    userEmail = user.email;
    log.info('User from session', { email: userEmail });
  } else {
    // Fallback to request body (client already verified user with getUser())
    const { userId: bodyUserId, email: bodyEmail } = req.body;

    if (!bodyUserId || !bodyEmail) {
      log.error('No user found in session or body', { sessionError: userError?.message });
      return res.status(401).json({ error: 'Unauthorized - no user found' });
    }

    userId = bodyUserId;
    userEmail = bodyEmail;
    log.info('User from body', { email: userEmail });
  }

  try {
    // Accept the invitation (link user account to reviewer record)
    const { reviewer, error } = await acceptReviewerInvite(userId, userEmail);

    if (error) {
      log.error('Accept invite error', { error, email: userEmail });
      return res.status(400).json({ error });
    }

    if (!reviewer) {
      return res.status(400).json({ error: 'No invitation found for this email' });
    }

    // Identify reviewer in PostHog
    await serverAnalytics.identify(reviewer.id, {
      email: reviewer.email,
      name: reviewer.name || undefined,
    });

    // Track reviewer authenticated
    await serverAnalytics.track('cfp_reviewer_authenticated', reviewer.id, {
      reviewer_id: reviewer.id,
      reviewer_email: reviewer.email,
    });

    log.info('Successfully accepted invite', { email: userEmail, reviewerId: reviewer.id });
    return res.status(200).json({ reviewer });
  } catch (error) {
    log.error('Error in reviewer auth callback', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
