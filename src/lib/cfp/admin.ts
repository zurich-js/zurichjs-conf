/**
 * CFP Admin Operations
 * Functions for managing CFP as an admin
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type {
  CfpSubmission,
  CfpSubmissionWithStats,
  CfpSubmissionStatus,
  CfpSpeaker,
  CfpTag,
  CfpReview,
  CfpReviewer,
  CfpSubmissionFilters,
  CfpStats,
  CfpSubmissionStats,
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
 * Get all submissions with filters and stats
 */
export async function getAdminSubmissions(
  filters: CfpSubmissionFilters = {}
): Promise<{ submissions: CfpSubmissionWithStats[]; total: number }> {
  const supabase = createCfpServiceClient();
  const {
    status,
    submission_type,
    talk_level,
    search,
    sort_by = 'created_at',
    sort_order = 'desc',
    limit = 50,
    offset = 0,
  } = filters;

  // Build query
  let query = supabase
    .from('cfp_submissions')
    .select('*', { count: 'exact' });

  // Apply filters
  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  if (submission_type) {
    if (Array.isArray(submission_type)) {
      query = query.in('submission_type', submission_type);
    } else {
      query = query.eq('submission_type', submission_type);
    }
  }

  if (talk_level) {
    if (Array.isArray(talk_level)) {
      query = query.in('talk_level', talk_level);
    } else {
      query = query.eq('talk_level', talk_level);
    }
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,abstract.ilike.%${search}%`);
  }

  // Apply sorting
  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  // Apply pagination
  const { data: submissions, count, error } = await query.range(offset, offset + limit - 1);

  if (error || !submissions) {
    console.error('[CFP Admin] Error fetching submissions:', error);
    return { submissions: [], total: 0 };
  }

  // Get speakers
  const speakerIds = [...new Set(submissions.map((s: { speaker_id: string }) => s.speaker_id))];
  const { data: speakers } = await supabase
    .from('cfp_speakers')
    .select('*')
    .in('id', speakerIds);

  const speakerMap: Record<string, CfpSpeaker> = Object.fromEntries(
    (speakers || []).map((s: CfpSpeaker) => [s.id, s])
  );

  // Get tags
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
    tagMap = Object.fromEntries((tags || []).map((t: CfpTag) => [t.id, t]));
  }

  // Get review stats for all submissions
  const { data: reviews } = await supabase
    .from('cfp_reviews')
    .select('submission_id, score_overall')
    .in('submission_id', submissionIds);

  const statsMap: Record<string, CfpSubmissionStats> = {};
  for (const id of submissionIds) {
    const submissionReviews = (reviews || []).filter((r: { submission_id: string }) => r.submission_id === id);
    const scores = submissionReviews.map((r: { score_overall: number }) => r.score_overall).filter(Boolean);
    statsMap[id] = {
      submission_id: id,
      review_count: submissionReviews.length,
      avg_overall: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null,
      avg_relevance: null,
      avg_technical_depth: null,
      avg_clarity: null,
      avg_diversity: null,
    };
  }

  // Build result
  const result: CfpSubmissionWithStats[] = submissions.map((s: CfpSubmission) => {
    const submissionTagIds = (tagJoins || [])
      .filter((j: { submission_id: string }) => j.submission_id === s.id)
      .map((j: { tag_id: string }) => j.tag_id);

    return {
      ...s,
      speaker: speakerMap[s.speaker_id],
      tags: submissionTagIds.map((tid: string) => tagMap[tid]).filter(Boolean),
      stats: statsMap[s.id],
    } as CfpSubmissionWithStats;
  });

  return { submissions: result, total: count || 0 };
}

/**
 * Get a single submission with full details for admin
 */
export async function getAdminSubmissionDetail(id: string): Promise<{
  submission: CfpSubmissionWithStats | null;
  reviews: CfpReview[];
}> {
  const supabase = createCfpServiceClient();

  // Get submission
  const { data: submission, error } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !submission) {
    return { submission: null, reviews: [] };
  }

  // Get speaker
  const { data: speaker } = await supabase
    .from('cfp_speakers')
    .select('*')
    .eq('id', submission.speaker_id)
    .single();

  // Get tags
  const { data: tagJoins } = await supabase
    .from('cfp_submission_tags')
    .select('tag_id')
    .eq('submission_id', id);

  const tagIds = (tagJoins || []).map((j: { tag_id: string }) => j.tag_id);
  let tags: CfpTag[] = [];

  if (tagIds.length > 0) {
    const { data } = await supabase
      .from('cfp_tags')
      .select('*')
      .in('id', tagIds);
    tags = (data || []) as CfpTag[];
  }

  // Get all reviews
  const { data: reviews } = await supabase
    .from('cfp_reviews')
    .select('*')
    .eq('submission_id', id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const reviewList = (reviews || []) as CfpReview[];
  const scores = reviewList.map((r) => r.score_overall).filter((s): s is number => s !== null);
  const stats: CfpSubmissionStats = {
    submission_id: id,
    review_count: reviewList.length,
    avg_overall: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    avg_relevance: null,
    avg_technical_depth: null,
    avg_clarity: null,
    avg_diversity: null,
  };

  return {
    submission: {
      ...submission,
      speaker: speaker as CfpSpeaker,
      tags,
      stats,
    } as CfpSubmissionWithStats,
    reviews: reviewList,
  };
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
  id: string,
  status: CfpSubmissionStatus
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_submissions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[CFP Admin] Error updating status:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get CFP statistics
 */
export async function getCfpStats(): Promise<CfpStats> {
  const supabase = createCfpServiceClient();

  // Get all submissions
  const { data: submissions } = await supabase
    .from('cfp_submissions')
    .select('id, status, submission_type, talk_level, travel_assistance_required');

  // Get all speakers
  const { data: speakers } = await supabase
    .from('cfp_speakers')
    .select('id');

  // Get all reviews
  const { data: reviews } = await supabase
    .from('cfp_reviews')
    .select('id, submission_id');

  const submissionList = (submissions || []) as Array<{
    id: string;
    status: CfpSubmissionStatus;
    submission_type: string;
    talk_level: string;
    travel_assistance_required: boolean;
  }>;

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  let travelRequested = 0;

  for (const s of submissionList) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byType[s.submission_type] = (byType[s.submission_type] || 0) + 1;
    byLevel[s.talk_level] = (byLevel[s.talk_level] || 0) + 1;
    if (s.travel_assistance_required) travelRequested++;
  }

  const acceptedCount = byStatus['accepted'] || 0;
  // Track unique reviewed submissions for potential future use
  void new Set((reviews || []).map((r: { submission_id: string }) => r.submission_id));

  return {
    total_submissions: submissionList.length,
    submissions_by_status: byStatus as Record<CfpSubmissionStatus, number>,
    submissions_by_type: byType as Record<string, number>,
    submissions_by_level: byLevel as Record<string, number>,
    total_speakers: (speakers || []).length,
    total_reviews: (reviews || []).length,
    avg_reviews_per_submission: submissionList.length > 0
      ? (reviews || []).length / submissionList.length
      : 0,
    travel_assistance_requested: travelRequested,
    accepted_speakers_count: acceptedCount,
    travel_confirmed_count: 0, // TODO: implement after travel table
  };
}

/**
 * Get all reviewers for admin
 */
export async function getAdminReviewers(): Promise<CfpReviewer[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviewers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[CFP Admin] Error fetching reviewers:', error);
    return [];
  }

  return (data || []) as CfpReviewer[];
}

/**
 * Get all speakers for admin
 */
export async function getAdminSpeakers(): Promise<CfpSpeaker[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speakers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[CFP Admin] Error fetching speakers:', error);
    return [];
  }

  return (data || []) as CfpSpeaker[];
}

/**
 * Get all tags for admin
 */
export async function getAdminTags(): Promise<CfpTag[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_tags')
    .select('*')
    .order('is_suggested', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('[CFP Admin] Error fetching tags:', error);
    return [];
  }

  return (data || []) as CfpTag[];
}
