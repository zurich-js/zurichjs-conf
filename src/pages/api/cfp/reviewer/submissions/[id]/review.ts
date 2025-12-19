/**
 * Reviewer Submission Review API
 * POST /api/cfp/reviewer/submissions/[id]/review - Submit a review
 * PUT /api/cfp/reviewer/submissions/[id]/review - Update a review
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { createReview, updateReview, getReviewBySubmissionAndReviewer } from '@/lib/cfp/reviews';
import type { CreateCfpReviewRequest } from '@/lib/types/cfp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  // Authenticate user from session - never trust request body for auth
  const supabase = createSupabaseApiClient(req, res);
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    console.error('[Reviewer Review API] Authentication failed:', userError?.message);
    return res.status(401).json({ error: 'Unauthorized - please log in' });
  }

  const userId = user.id;
  console.log('[Reviewer Review API] Authenticated user:', user.email);

  // Get reviewer
  const reviewer = await getReviewerByUserId(userId);

  if (!reviewer || !reviewer.accepted_at) {
    return res.status(403).json({ error: 'Not a reviewer' });
  }

  // Check permissions - readonly reviewers can't submit reviews
  if (reviewer.role === 'readonly') {
    return res.status(403).json({ error: 'Readonly reviewers cannot submit reviews' });
  }

  // Validate request body
  const {
    score_overall,
    score_relevance,
    score_technical_depth,
    score_clarity,
    score_diversity,
    private_notes,
    feedback_to_speaker,
  } = req.body;

  if (!score_overall || score_overall < 1 || score_overall > 5) {
    return res.status(400).json({ error: 'Overall score must be between 1 and 5' });
  }

  try {
    const reviewData: CreateCfpReviewRequest = {
      score_overall,
      score_relevance: score_relevance || undefined,
      score_technical_depth: score_technical_depth || undefined,
      score_clarity: score_clarity || undefined,
      score_diversity: score_diversity || undefined,
      private_notes: private_notes || undefined,
      feedback_to_speaker: feedback_to_speaker || undefined,
    };

    if (req.method === 'POST') {
      // Create new review
      const { review, error } = await createReview(id, reviewer.id, reviewData);

      if (error) {
        return res.status(400).json({ error });
      }

      return res.status(201).json({ review });
    } else {
      // Update existing review
      const existingReview = await getReviewBySubmissionAndReviewer(id, reviewer.id);

      if (!existingReview) {
        return res.status(404).json({ error: 'Review not found' });
      }

      const { review, error } = await updateReview(existingReview.id, reviewer.id, reviewData);

      if (error) {
        return res.status(400).json({ error });
      }

      return res.status(200).json({ review });
    }
  } catch (error) {
    console.error('[Reviewer Review API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
