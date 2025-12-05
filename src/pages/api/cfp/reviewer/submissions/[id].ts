/**
 * Reviewer Submission Detail API
 * POST /api/cfp/reviewer/submissions/[id] - Get submission for review
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { getSubmissionForReview } from '@/lib/cfp/reviews';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing submission ID' });
  }

  let userId: string;

  try {
    // Try to get user from Supabase session first
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.email) {
      userId = user.id;
      console.log('[Reviewer Submission API] User from session:', user.email);
    } else {
      // Fallback to request body
      const { userId: bodyUserId } = req.body;

      if (!bodyUserId) {
        console.error('[Reviewer Submission API] No user found in session or body');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      userId = bodyUserId;
      console.log('[Reviewer Submission API] User from body:', userId);
    }

    // Get the reviewer record
    const reviewer = await getReviewerByUserId(userId);

    if (!reviewer) {
      console.log('[Reviewer Submission API] No reviewer found for user:', userId);
      return res.status(401).json({ error: 'Not authorized as a reviewer' });
    }

    if (!reviewer.accepted_at) {
      console.log('[Reviewer Submission API] Reviewer has not accepted invite:', reviewer.email);
      return res.status(401).json({ error: 'Invitation not accepted' });
    }

    // Get submission for review
    const { submission, error: submissionError } = await getSubmissionForReview(id, reviewer);

    if (submissionError || !submission) {
      console.log('[Reviewer Submission API] Submission not found:', id);
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.status(200).json({
      reviewer,
      submission,
    });
  } catch (error) {
    console.error('[Reviewer Submission API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
