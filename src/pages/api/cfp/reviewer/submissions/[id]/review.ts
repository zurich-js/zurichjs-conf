/**
 * Reviewer Submission Review API
 * POST /api/cfp/reviewer/submissions/[id]/review - Submit a review
 * PUT /api/cfp/reviewer/submissions/[id]/review - Update a review
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { createReview, updateReview, getReviewBySubmissionAndReviewer } from '@/lib/cfp/reviews';
import { reviewSchema } from '@/lib/validations/cfp';
import { logger } from '@/lib/logger';

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

  const log = logger.scope('ReviewerReviewAPI', { submissionId: id as string });

  if (userError || !user || !user.email) {
    log.warn('Authentication failed', { error: userError?.message });
    return res.status(401).json({ error: 'Unauthorized - please log in' });
  }

  const userId = user.id;
  log.debug('Authenticated user', { email: user.email });

  // Get reviewer
  const reviewer = await getReviewerByUserId(userId);

  if (!reviewer || !reviewer.accepted_at) {
    return res.status(403).json({ error: 'Not a reviewer' });
  }

  // Check permissions - readonly reviewers can't submit reviews
  if (reviewer.role === 'readonly') {
    return res.status(403).json({ error: 'Readonly reviewers cannot submit reviews' });
  }

  // Validate request body with Zod
  const result = reviewSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
  }

  try {
    const reviewData = result.data;

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
    log.error('Failed to process review', error, { type: 'system' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
