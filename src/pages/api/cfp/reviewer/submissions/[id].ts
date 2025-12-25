/**
 * Reviewer Submission Detail API
 * POST /api/cfp/reviewer/submissions/[id] - Get submission for review
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { getSubmissionForReview } from '@/lib/cfp/reviews';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Reviewer Submission API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing submission ID' });
  }

  try {
    // Authenticate user from session - never trust request body for auth
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      log.warn('Authentication failed', { error: userError?.message });
      return res.status(401).json({ error: 'Unauthorized - please log in' });
    }

    const userId = user.id;
    log.info('Authenticated user', { email: user.email });

    // Get the reviewer record
    const reviewer = await getReviewerByUserId(userId);

    if (!reviewer) {
      log.warn('No reviewer found for user', { userId });
      return res.status(401).json({ error: 'Not authorized as a reviewer' });
    }

    if (!reviewer.accepted_at) {
      log.warn('Reviewer has not accepted invite', { email: reviewer.email });
      return res.status(401).json({ error: 'Invitation not accepted' });
    }

    // Get submission for review
    const { submission, error: submissionError } = await getSubmissionForReview(id, reviewer);

    if (submissionError || !submission) {
      log.warn('Submission not found', { submissionId: id });
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.status(200).json({
      reviewer,
      submission,
    });
  } catch (error) {
    log.error('Error fetching submission for review', error, { submissionId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
