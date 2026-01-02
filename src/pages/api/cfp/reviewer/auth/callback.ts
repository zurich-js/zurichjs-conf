/**
 * CFP Reviewer Auth Callback API
 * Accepts reviewer invite after client-side authentication (implicit flow)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { acceptReviewerInvite, createSupabaseApiClient } from '@/lib/cfp/auth';
import { serverAnalytics } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Reviewer Auth Callback API');

const requestSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { userId, email } = parsed.data;

    // Verify the user is actually authenticated
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthorized callback request', { userId, email });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the user ID matches
    if (user.id !== userId) {
      log.warn('User ID mismatch in callback', { claimedUserId: userId, actualUserId: user.id });
      return res.status(403).json({ error: 'User ID mismatch' });
    }

    // Accept reviewer invite
    const { reviewer, error: reviewerError } = await acceptReviewerInvite(userId, email);

    if (reviewerError || !reviewer) {
      log.error('Failed to accept reviewer invite', { userId, email, error: reviewerError });
      serverAnalytics.captureException(new Error(reviewerError || 'No invitation found'), {
        distinctId: userId,
        type: 'auth',
        severity: 'high',
        flow: 'cfp_reviewer_auth_callback_api',
        action: 'accept_reviewer_invite',
        email,
      });
      return res.status(400).json({ error: reviewerError || 'No invitation found for this email' });
    }

    // Track successful authentication
    await serverAnalytics.identify(reviewer.id, {
      email: reviewer.email,
      name: reviewer.name || undefined,
    });

    await serverAnalytics.track('cfp_reviewer_authenticated', reviewer.id, {
      reviewer_id: reviewer.id,
      reviewer_email: reviewer.email,
    });

    log.info('Reviewer authenticated via implicit flow', { reviewerId: reviewer.id, email: reviewer.email });

    return res.status(200).json({
      success: true,
      reviewer: {
        id: reviewer.id,
        email: reviewer.email,
        name: reviewer.name,
      },
    });
  } catch (error) {
    log.error('Unexpected error in reviewer auth callback API', error);
    serverAnalytics.captureException(error, {
      type: 'auth',
      severity: 'critical',
      flow: 'cfp_reviewer_auth_callback_api',
      action: 'unexpected_error',
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
