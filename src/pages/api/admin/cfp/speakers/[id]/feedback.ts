/**
 * CFP Admin Speaker Feedback API
 * GET /api/admin/cfp/speakers/[id]/feedback
 * Returns a unified view of all submissions + reviews for a speaker,
 * used to explain CFP rejection/acceptance rationale to the speaker.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import type {
  SpeakerFeedbackAggregate,
  SpeakerFeedbackResponse,
  SpeakerFeedbackSubmission,
} from '@/lib/types/cfp-admin';

const log = logger.scope('CFP Admin Speaker Feedback API');

function createCfpServiceClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function avg(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Speaker ID is required' });
  }

  const supabase = createCfpServiceClient();

  try {
    // Fetch all submissions for this speaker
    const { data: submissions, error: submissionsError } = await supabase
      .from('cfp_submissions')
      .select(
        'id, title, abstract, submission_type, talk_level, status, submitted_at, created_at'
      )
      .eq('speaker_id', id)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      log.error('Error fetching speaker submissions', submissionsError, { speakerId: id });
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }

    const submissionIds = (submissions || []).map((s) => s.id);

    // Fetch reviews for all those submissions in a single query
    let reviews: Array<{
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
    }> = [];

    if (submissionIds.length > 0) {
      const { data: reviewData, error: reviewsError } = await supabase
        .from('cfp_reviews')
        .select(
          'id, submission_id, reviewer_id, score_overall, score_relevance, score_technical_depth, score_clarity, score_diversity, private_notes, feedback_to_speaker, created_at'
        )
        .in('submission_id', submissionIds)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        log.error('Error fetching reviews for speaker', reviewsError, { speakerId: id });
        return res.status(500).json({ error: 'Failed to fetch reviews' });
      }

      reviews = reviewData || [];
    }

    // Fetch reviewer info for any reviewers referenced
    const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];
    const reviewerMap: Record<string, { id: string; name: string | null; email: string }> = {};

    if (reviewerIds.length > 0) {
      const { data: reviewers } = await supabase
        .from('cfp_reviewers')
        .select('id, name, email')
        .in('id', reviewerIds);

      for (const r of reviewers || []) {
        reviewerMap[r.id] = { id: r.id, name: r.name, email: r.email };
      }
    }

    // Group reviews by submission
    const reviewsBySubmission = new Map<string, typeof reviews>();
    for (const review of reviews) {
      const list = reviewsBySubmission.get(review.submission_id) || [];
      list.push(review);
      reviewsBySubmission.set(review.submission_id, list);
    }

    // Build response
    const responseSubmissions: SpeakerFeedbackSubmission[] = (submissions || []).map((sub) => {
      const subReviews = reviewsBySubmission.get(sub.id) || [];

      const aggregate: SpeakerFeedbackAggregate = {
        overall: avg(subReviews.map((r) => r.score_overall)),
        relevance: avg(subReviews.map((r) => r.score_relevance)),
        technical_depth: avg(subReviews.map((r) => r.score_technical_depth)),
        clarity: avg(subReviews.map((r) => r.score_clarity)),
        diversity: avg(subReviews.map((r) => r.score_diversity)),
      };

      return {
        id: sub.id,
        title: sub.title,
        abstract: sub.abstract,
        submission_type: sub.submission_type,
        talk_level: sub.talk_level,
        status: sub.status,
        submitted_at: sub.submitted_at,
        created_at: sub.created_at,
        review_count: subReviews.length,
        aggregate,
        reviews: subReviews.map((r) => ({
          id: r.id,
          score_overall: r.score_overall,
          score_relevance: r.score_relevance,
          score_technical_depth: r.score_technical_depth,
          score_clarity: r.score_clarity,
          score_diversity: r.score_diversity,
          private_notes: r.private_notes,
          feedback_to_speaker: r.feedback_to_speaker,
          created_at: r.created_at,
          reviewer: reviewerMap[r.reviewer_id] || {
            id: r.reviewer_id,
            name: null,
            email: 'Unknown',
          },
        })),
      };
    });

    const overallAvg = avg(reviews.map((r) => r.score_overall));

    const response: SpeakerFeedbackResponse = {
      speakerId: id,
      submissions: responseSubmissions,
      overall: {
        total_submissions: responseSubmissions.length,
        total_reviews: reviews.length,
        avg_overall: overallAvg,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error('Error building speaker feedback', error, { speakerId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
