/**
 * Reviewer Dashboard API
 * GET /api/cfp/reviewer/dashboard - Get reviewer data and submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { createCfpServiceClient } from '@/lib/supabase/cfp-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user from session - never trust request body for auth
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      console.error('[Reviewer Dashboard API] Authentication failed:', userError?.message);
      return res.status(401).json({ error: 'Unauthorized - please log in' });
    }

    const userId = user.id;
    const userEmail = user.email;
    console.log('[Reviewer Dashboard API] Authenticated user:', userEmail);

    // Get the reviewer record
    const reviewer = await getReviewerByUserId(userId);

    if (!reviewer) {
      console.log('[Reviewer Dashboard API] No reviewer found for user:', userId);
      return res.status(401).json({ error: 'Not authorized as a reviewer' });
    }

    console.log('[Reviewer Dashboard API] Reviewer found:', reviewer.email);

    // Fetch submissions for review
    const supabaseAdmin = createCfpServiceClient();

    // Get all submitted submissions (not drafts or withdrawn)
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('cfp_submissions')
      .select(`
        *,
        tags:cfp_submission_tags(
          tag:cfp_tags(*)
        )
      `)
      .in('status', ['submitted', 'under_review', 'waitlisted', 'accepted', 'rejected'])
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      console.error('[Reviewer Dashboard API] Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }

    // Get this reviewer's reviews
    const { data: myReviews, error: reviewsError } = await supabaseAdmin
      .from('cfp_reviews')
      .select('*')
      .eq('reviewer_id', reviewer.id);

    if (reviewsError) {
      console.error('[Reviewer Dashboard API] Error fetching reviews:', reviewsError);
    }

    // Get review stats for each submission
    const { data: reviewStats, error: statsError } = await supabaseAdmin
      .from('cfp_reviews')
      .select('submission_id, score_overall');

    if (statsError) {
      console.error('[Reviewer Dashboard API] Error fetching stats:', statsError);
    }

    // Create a map of my reviews by submission_id
    const myReviewsMap = new Map(
      (myReviews || []).map(review => [review.submission_id, review])
    );

    // Calculate stats per submission
    const statsMap = new Map<string, { review_count: number; avg_overall: number | null }>();
    if (reviewStats) {
      const grouped = reviewStats.reduce((acc, review) => {
        if (!acc[review.submission_id]) {
          acc[review.submission_id] = [];
        }
        acc[review.submission_id].push(review.score_overall);
        return acc;
      }, {} as Record<string, number[]>);

      for (const [submissionId, scores] of Object.entries(grouped)) {
        const validScores = scores.filter(s => s !== null);
        statsMap.set(submissionId, {
          review_count: validScores.length,
          avg_overall: validScores.length > 0
            ? validScores.reduce((a, b) => a + b, 0) / validScores.length
            : null,
        });
      }
    }

    // Format submissions with tags, my review, and stats
    const formattedSubmissions = (submissions || []).map(submission => {
      // Extract tags from the nested structure
      const tags = submission.tags
        ?.map((t: { tag: { id: string; name: string } }) => t.tag)
        .filter(Boolean) || [];

      return {
        ...submission,
        tags,
        my_review: myReviewsMap.get(submission.id) || null,
        stats: statsMap.get(submission.id) || { review_count: 0, avg_overall: null },
      };
    });

    console.log('[Reviewer Dashboard API] Returning', formattedSubmissions.length, 'submissions');

    return res.status(200).json({
      reviewer,
      submissions: formattedSubmissions,
      total: formattedSubmissions.length,
    });
  } catch (error) {
    console.error('[Reviewer Dashboard API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
