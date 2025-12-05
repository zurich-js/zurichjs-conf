/**
 * CFP Reviews CRUD Operations
 * Functions for managing submission reviews
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type {
  CfpReview,
  CfpSubmission,
  CfpSubmissionStats,
  CfpSpeaker,
  CfpTag,
  CfpReviewer,
  CreateCfpReviewRequest
} from '../types/cfp';

/**
 * Create untyped Supabase client for CFP tables
 */
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

/**
 * Get a review by ID
 */
export async function getReviewById(id: string): Promise<CfpReview | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviews')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpReview;
}

/**
 * Get a review by submission and reviewer
 */
export async function getReviewBySubmissionAndReviewer(
  submissionId: string,
  reviewerId: string
): Promise<CfpReview | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviews')
    .select('*')
    .eq('submission_id', submissionId)
    .eq('reviewer_id', reviewerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpReview;
}

/**
 * Get all reviews for a submission
 */
export async function getReviewsForSubmission(submissionId: string): Promise<CfpReview[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviews')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CfpReview[];
}

/**
 * Get all reviews by a reviewer
 */
export async function getReviewsByReviewer(reviewerId: string): Promise<CfpReview[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviews')
    .select('*')
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CfpReview[];
}

/**
 * Create a new review
 */
export async function createReview(
  submissionId: string,
  reviewerId: string,
  request: CreateCfpReviewRequest
): Promise<{ review: CfpReview | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  // Check if review already exists
  const existing = await getReviewBySubmissionAndReviewer(submissionId, reviewerId);
  if (existing) {
    return { review: null, error: 'You have already reviewed this submission' };
  }

  // Validate scores (1-5)
  if (request.score_overall < 1 || request.score_overall > 5) {
    return { review: null, error: 'Overall score must be between 1 and 5' };
  }

  const { data, error } = await supabase
    .from('cfp_reviews')
    .insert({
      submission_id: submissionId,
      reviewer_id: reviewerId,
      score_overall: request.score_overall,
      score_relevance: request.score_relevance || null,
      score_technical_depth: request.score_technical_depth || null,
      score_clarity: request.score_clarity || null,
      score_diversity: request.score_diversity || null,
      private_notes: request.private_notes || null,
      feedback_to_speaker: request.feedback_to_speaker || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[CFP Reviews] Error creating review:', error);
    return { review: null, error: error?.message || 'Failed to create review' };
  }

  return { review: data as CfpReview, error: null };
}

/**
 * Update a review
 */
export async function updateReview(
  id: string,
  reviewerId: string,
  updates: Partial<CreateCfpReviewRequest>
): Promise<{ review: CfpReview | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  // Verify ownership
  const existing = await getReviewById(id);
  if (!existing) {
    return { review: null, error: 'Review not found' };
  }
  if (existing.reviewer_id !== reviewerId) {
    return { review: null, error: 'Access denied' };
  }

  const { data, error } = await supabase
    .from('cfp_reviews')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('reviewer_id', reviewerId)
    .select()
    .single();

  if (error || !data) {
    console.error('[CFP Reviews] Error updating review:', error);
    return { review: null, error: error?.message || 'Failed to update review' };
  }

  return { review: data as CfpReview, error: null };
}

/**
 * Delete a review
 */
export async function deleteReview(
  id: string,
  reviewerId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  // Verify ownership
  const existing = await getReviewById(id);
  if (!existing) {
    return { success: false, error: 'Review not found' };
  }
  if (existing.reviewer_id !== reviewerId) {
    return { success: false, error: 'Access denied' };
  }

  const { error } = await supabase
    .from('cfp_reviews')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[CFP Reviews] Error deleting review:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get aggregated stats for a submission
 */
export async function getSubmissionStats(submissionId: string): Promise<CfpSubmissionStats> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviews')
    .select('score_overall, score_relevance, score_technical_depth, score_clarity, score_diversity')
    .eq('submission_id', submissionId);

  if (error || !data || data.length === 0) {
    return {
      submission_id: submissionId,
      review_count: 0,
      avg_overall: null,
      avg_relevance: null,
      avg_technical_depth: null,
      avg_clarity: null,
      avg_diversity: null,
    };
  }

  const avg = (arr: (number | null)[]): number | null => {
    const valid = arr.filter((v): v is number => v !== null);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };

  return {
    submission_id: submissionId,
    review_count: data.length,
    avg_overall: avg(data.map((r) => r.score_overall)),
    avg_relevance: avg(data.map((r) => r.score_relevance)),
    avg_technical_depth: avg(data.map((r) => r.score_technical_depth)),
    avg_clarity: avg(data.map((r) => r.score_clarity)),
    avg_diversity: avg(data.map((r) => r.score_diversity)),
  };
}

/**
 * Get submissions for review (respecting anonymous mode)
 */
export async function getSubmissionsForReview(
  reviewer: CfpReviewer,
  options: {
    status?: string[];
    excludeReviewed?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  submissions: Array<CfpSubmission & {
    speaker?: CfpSpeaker | null;
    tags?: CfpTag[];
    my_review?: CfpReview | null;
    stats: CfpSubmissionStats;
  }>;
  total: number;
}> {
  const supabase = createCfpServiceClient();
  const { status = ['submitted', 'under_review'], excludeReviewed = false, limit = 50, offset = 0 } = options;

  // Build query - get submissions in review-ready states
  const query = supabase
    .from('cfp_submissions')
    .select('*', { count: 'exact' })
    .in('status', status)
    .order('submitted_at', { ascending: true });

  const { data: submissions, count, error } = await query.range(offset, offset + limit - 1);

  if (error || !submissions) {
    return { submissions: [], total: 0 };
  }

  // Get speaker data if reviewer can see identity
  const speakerIds = [...new Set(submissions.map((s: { speaker_id: string }) => s.speaker_id))];
  let speakerMap: Record<string, CfpSpeaker> = {};

  if (reviewer.can_see_speaker_identity && speakerIds.length > 0) {
    const { data: speakers } = await supabase
      .from('cfp_speakers')
      .select('*')
      .in('id', speakerIds);

    if (speakers) {
      speakerMap = Object.fromEntries(speakers.map((s: CfpSpeaker) => [s.id, s]));
    }
  }

  // Get tags for all submissions
  const submissionIds = submissions.map((s: { id: string }) => s.id);
  const { data: tagJoins } = await supabase
    .from('cfp_submission_tags')
    .select('submission_id, tag_id')
    .in('submission_id', submissionIds);

  const tagIds = [...new Set((tagJoins || []).map((j: { tag_id: string }) => j.tag_id))];
  let tagMap: Record<string, CfpTag> = {};

  if (tagIds.length > 0) {
    const { data: tags } = await supabase
      .from('cfp_tags')
      .select('*')
      .in('id', tagIds);

    if (tags) {
      tagMap = Object.fromEntries(tags.map((t: CfpTag) => [t.id, t]));
    }
  }

  // Get reviewer's own reviews
  const { data: myReviews } = await supabase
    .from('cfp_reviews')
    .select('*')
    .eq('reviewer_id', reviewer.id)
    .in('submission_id', submissionIds);

  const myReviewMap: Record<string, CfpReview> = Object.fromEntries(
    (myReviews || []).map((r: CfpReview) => [r.submission_id, r])
  );

  // Get stats for all submissions
  const statsMap: Record<string, CfpSubmissionStats> = {};
  for (const id of submissionIds) {
    statsMap[id] = await getSubmissionStats(id);
  }

  // Build result
  let result = submissions.map((s: CfpSubmission) => {
    const submissionTagIds = (tagJoins || [])
      .filter((j: { submission_id: string }) => j.submission_id === s.id)
      .map((j: { tag_id: string }) => j.tag_id);

    return {
      ...s,
      speaker: reviewer.can_see_speaker_identity ? speakerMap[s.speaker_id] : undefined,
      tags: submissionTagIds.map((tid: string) => tagMap[tid]).filter(Boolean),
      my_review: myReviewMap[s.id] || null,
      stats: statsMap[s.id],
    };
  });

  // Filter out reviewed if requested
  if (excludeReviewed) {
    result = result.filter((s) => !s.my_review);
  }

  return { submissions: result, total: count || 0 };
}

/**
 * Get a single submission for review
 *
 * Permission levels:
 * - super_admin: See everything (speaker, all reviews, recordings/slides, full stats)
 * - reviewer: Anonymous mode (no speaker, no other reviews, no recordings/slides, limited stats)
 * - readonly: Same as reviewer but cannot submit reviews
 */
export async function getSubmissionForReview(
  submissionId: string,
  reviewer: CfpReviewer
): Promise<{
  submission: (CfpSubmission & {
    speaker?: CfpSpeaker | null;
    tags?: CfpTag[];
    my_review?: CfpReview | null;
    all_reviews?: CfpReview[];
    stats: CfpSubmissionStats;
  }) | null;
  error?: string;
}> {
  const supabase = createCfpServiceClient();
  const isSuperAdmin = reviewer.role === 'super_admin';

  // Get submission
  const { data: submission, error } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .in('status', ['submitted', 'under_review', 'waitlisted', 'accepted', 'rejected'])
    .single();

  if (error || !submission) {
    return { submission: null, error: 'Submission not found' };
  }

  // Get speaker only for super_admin
  let speaker: CfpSpeaker | null = null;
  if (isSuperAdmin) {
    const { data } = await supabase
      .from('cfp_speakers')
      .select('*')
      .eq('id', submission.speaker_id)
      .single();
    speaker = data as CfpSpeaker | null;
  }

  // Get tags
  const { data: tagJoins } = await supabase
    .from('cfp_submission_tags')
    .select('tag_id')
    .eq('submission_id', submissionId);

  const tagIds = (tagJoins || []).map((j: { tag_id: string }) => j.tag_id);
  let tags: CfpTag[] = [];

  if (tagIds.length > 0) {
    const { data } = await supabase
      .from('cfp_tags')
      .select('*')
      .in('id', tagIds);
    tags = (data || []) as CfpTag[];
  }

  // Get my review
  const { data: myReview } = await supabase
    .from('cfp_reviews')
    .select('*')
    .eq('submission_id', submissionId)
    .eq('reviewer_id', reviewer.id)
    .single();

  // Get all reviews only for super_admin
  let allReviews: CfpReview[] = [];
  if (isSuperAdmin) {
    const { data } = await supabase
      .from('cfp_reviews')
      .select('*')
      .eq('submission_id', submissionId);
    allReviews = (data || []) as CfpReview[];
  }

  // Get stats - for non-super_admin, only show review count (no averages to prevent bias)
  const fullStats = await getSubmissionStats(submissionId);
  const stats: CfpSubmissionStats = isSuperAdmin
    ? fullStats
    : {
        submission_id: submissionId,
        review_count: fullStats.review_count,
        avg_overall: null,
        avg_relevance: null,
        avg_technical_depth: null,
        avg_clarity: null,
        avg_diversity: null,
      };

  // Build the submission response
  // For non-super_admin, strip out sensitive fields that could bias review
  const sanitizedSubmission = isSuperAdmin
    ? submission
    : {
        ...submission,
        slides_url: null,
        previous_recording_url: null,
      };

  return {
    submission: {
      ...sanitizedSubmission,
      speaker,
      tags,
      my_review: myReview as CfpReview | null,
      all_reviews: allReviews,
      stats,
    } as CfpSubmission & {
      speaker?: CfpSpeaker | null;
      tags?: CfpTag[];
      my_review?: CfpReview | null;
      all_reviews?: CfpReview[];
      stats: CfpSubmissionStats;
    },
  };
}
