/**
 * CFP Admin Submission Detail API
 * GET /api/admin/cfp/submissions/[id] - Get submission details with reviews and reviewer info
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSubmissionDetail } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { CfpSubmissionWithStats } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Submission Detail API');

interface ReviewWithReviewer {
  id: string;
  submission_id: string;
  reviewer_id: string;
  score_overall: number | null;
  score_relevance: number | null;
  score_technical_depth: number | null;
  score_clarity: number | null;
  score_diversity: number | null;
  private_notes: string | null;
  feedback_to_speaker: string | null;
  created_at: string;
  updated_at: string;
  reviewer: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface SubmissionDetailResponse {
  submission: CfpSubmissionWithStats;
  reviews: ReviewWithReviewer[];
}

function createCfpServiceClient() {
  return createClient(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  // GET - Get submission details with reviews
  if (req.method === 'GET') {
    try {
      // Get submission and reviews
      const { submission, reviews } = await getAdminSubmissionDetail(id);

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // If there are reviews, fetch reviewer info
      let reviewsWithReviewers: ReviewWithReviewer[] = [];

      if (reviews.length > 0) {
        const supabase = createCfpServiceClient();

        // Get unique reviewer IDs
        const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];

        // Fetch reviewer details
        const { data: reviewers } = await supabase
          .from('cfp_reviewers')
          .select('id, name, email')
          .in('id', reviewerIds);

        const reviewerMap: Record<string, { id: string; name: string | null; email: string }> = {};
        if (reviewers) {
          for (const r of reviewers) {
            reviewerMap[r.id] = { id: r.id, name: r.name, email: r.email };
          }
        }

        // Attach reviewer info to each review
        reviewsWithReviewers = reviews.map((review) => ({
          ...review,
          reviewer: reviewerMap[review.reviewer_id] || { id: review.reviewer_id, name: null, email: 'Unknown' },
        }));
      }

      const response: SubmissionDetailResponse = {
        submission,
        reviews: reviewsWithReviewers,
      };

      return res.status(200).json(response);
    } catch (error) {
      log.error('Error fetching submission detail', error, { submissionId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT - Update submission details
  if (req.method === 'PUT') {
    try {
      const supabase = createCfpServiceClient();
      const {
        title,
        abstract,
        submission_type,
        talk_level,
        outline,
        target_audience,
        // Workshop-specific fields
        workshop_duration_hours,
        workshop_expected_compensation,
        workshop_compensation_amount,
        workshop_special_requirements,
        workshop_max_participants,
      } = req.body;

      // Validate required fields if provided
      if (submission_type && !['lightning', 'standard', 'workshop'].includes(submission_type)) {
        return res.status(400).json({ error: 'Invalid submission type' });
      }
      if (talk_level && !['beginner', 'intermediate', 'advanced'].includes(talk_level)) {
        return res.status(400).json({ error: 'Invalid talk level' });
      }

      // Build update object with only provided fields
      const updateData: Record<string, string | number | null> = {};
      if (title !== undefined) updateData.title = title;
      if (abstract !== undefined) updateData.abstract = abstract;
      if (submission_type !== undefined) updateData.submission_type = submission_type;
      if (talk_level !== undefined) updateData.talk_level = talk_level;
      if (outline !== undefined) updateData.outline = outline;
      if (target_audience !== undefined) updateData.target_audience = target_audience;

      // Workshop-specific fields
      if (workshop_duration_hours !== undefined) updateData.workshop_duration_hours = workshop_duration_hours;
      if (workshop_expected_compensation !== undefined) updateData.workshop_expected_compensation = workshop_expected_compensation;
      if (workshop_compensation_amount !== undefined) updateData.workshop_compensation_amount = workshop_compensation_amount;
      if (workshop_special_requirements !== undefined) updateData.workshop_special_requirements = workshop_special_requirements;
      if (workshop_max_participants !== undefined) updateData.workshop_max_participants = workshop_max_participants;

      // If switching away from workshop, clear workshop fields
      if (submission_type && submission_type !== 'workshop') {
        updateData.workshop_duration_hours = null;
        updateData.workshop_expected_compensation = null;
        updateData.workshop_compensation_amount = null;
        updateData.workshop_special_requirements = null;
        updateData.workshop_max_participants = null;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { data, error } = await supabase
        .from('cfp_submissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating submission', error, { submissionId: id });
        return res.status(500).json({ error: 'Failed to update submission' });
      }

      log.info('Submission updated', { submissionId: id });
      return res.status(200).json({ submission: data });
    } catch (error) {
      log.error('Error updating submission', error, { submissionId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE - Delete submission and all related data
  if (req.method === 'DELETE') {
    try {
      const supabase = createCfpServiceClient();

      // First verify the submission exists
      const { data: submission, error: fetchError } = await supabase
        .from('cfp_submissions')
        .select('id, title')
        .eq('id', id)
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Delete related reviews first
      const { error: reviewsError } = await supabase
        .from('cfp_reviews')
        .delete()
        .eq('submission_id', id);

      if (reviewsError) {
        log.error('Error deleting reviews', reviewsError, { submissionId: id });
        return res.status(500).json({ error: 'Failed to delete submission reviews' });
      }

      // Delete submission tags
      const { error: tagsError } = await supabase
        .from('cfp_submission_tags')
        .delete()
        .eq('submission_id', id);

      if (tagsError) {
        log.error('Error deleting tags', tagsError, { submissionId: id });
        return res.status(500).json({ error: 'Failed to delete submission tags' });
      }

      // Finally delete the submission
      const { error: deleteError } = await supabase
        .from('cfp_submissions')
        .delete()
        .eq('id', id);

      if (deleteError) {
        log.error('Error deleting submission', deleteError, { submissionId: id });
        return res.status(500).json({ error: 'Failed to delete submission' });
      }

      log.info('Deleted submission', { submissionId: id, title: submission.title });
      return res.status(200).json({ success: true });
    } catch (error) {
      log.error('Error deleting submission', error, { submissionId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
