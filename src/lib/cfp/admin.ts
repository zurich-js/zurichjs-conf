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
import type {
  CfpAdminReviewerWithActivity,
  CfpReviewerActivity,
  CfpInsights,
  CfpAdminSubmissionStats,
} from '../types/cfp-admin';
import {
  computeSubmissionScoring,
  getScoreBucket,
  getCoverageBucket,
  type ShortlistStatus,
  type ReviewInput,
} from './scoring';

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
    limit,
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

  // Apply pagination (if limit is provided)
  let queryResult;
  if (limit) {
    queryResult = await query.range(offset, offset + limit - 1);
  } else {
    queryResult = await query;
  }

  const { data: submissions, count, error } = queryResult;

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

  // Get review stats for all submissions (include created_at for last_reviewed_at)
  const { data: reviews } = await supabase
    .from('cfp_reviews')
    .select('submission_id, score_overall, created_at')
    .in('submission_id', submissionIds);

  // Get total active reviewers for coverage calculation
  const { count: totalReviewers } = await supabase
    .from('cfp_reviewers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const totalReviewerCount = totalReviewers || 0;

  // Group reviews by submission for efficient processing
  const reviewsBySubmission = new Map<string, ReviewInput[]>();
  for (const review of reviews || []) {
    const submissionId = review.submission_id as string;
    if (!reviewsBySubmission.has(submissionId)) {
      reviewsBySubmission.set(submissionId, []);
    }
    reviewsBySubmission.get(submissionId)!.push({
      score_overall: review.score_overall as number | null,
      created_at: review.created_at as string,
    });
  }

  // Build stats using the scoring utility
  const statsMap: Record<string, CfpSubmissionStats & CfpAdminSubmissionStats> = {};
  for (const id of submissionIds) {
    const submissionReviews = reviewsBySubmission.get(id) || [];
    const scoring = computeSubmissionScoring(submissionReviews, totalReviewerCount);

    statsMap[id] = {
      submission_id: id,
      review_count: scoring.reviewCount,
      avg_overall: scoring.avgScore,
      avg_relevance: null,
      avg_technical_depth: null,
      avg_clarity: null,
      avg_diversity: null,
      total_reviewers: totalReviewerCount,
      coverage_ratio: scoring.coverageRatio,
      coverage_percent: scoring.coveragePercent,
      last_reviewed_at: scoring.lastReviewedAt,
      shortlist_status: scoring.status,
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

  // Get all reviews with timestamps for activity tracking
  const { data: reviews } = await supabase
    .from('cfp_reviews')
    .select('id, submission_id, reviewer_id, created_at');

  // Get count of active reviewers
  const { count: totalReviewers } = await supabase
    .from('cfp_reviewers')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  // Calculate active reviewers in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const recentReviewerIds = new Set(
    (reviews || [])
      .filter((r: { created_at: string }) => r.created_at >= sevenDaysAgoISO)
      .map((r: { reviewer_id: string }) => r.reviewer_id)
  );
  const activeReviewers7d = recentReviewerIds.size;

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
    total_reviewers: totalReviewers || 0,
    active_reviewers_7d: activeReviewers7d,
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
 * Get all speakers with their submissions for admin (single query)
 * Avoids N+1 query problem by fetching all data in parallel
 */
export async function getAdminSpeakersWithSubmissions(): Promise<
  (CfpSpeaker & { submissions: { id: string; title: string; status: string; submission_type: string }[] })[]
> {
  const supabase = createCfpServiceClient();

  // Fetch speakers and all submissions in parallel
  const [speakersResult, submissionsResult] = await Promise.all([
    supabase.from('cfp_speakers').select('*').order('created_at', { ascending: false }),
    supabase
      .from('cfp_submissions')
      .select('id, title, status, submission_type, speaker_id')
      .order('created_at', { ascending: false }),
  ]);

  if (speakersResult.error) {
    console.error('[CFP Admin] Error fetching speakers:', speakersResult.error);
    return [];
  }

  const speakers = (speakersResult.data || []) as CfpSpeaker[];
  const submissions = submissionsResult.data || [];

  // Group submissions by speaker_id for O(n) lookup
  const submissionsBySpeakerId = new Map<string, typeof submissions>();
  for (const submission of submissions) {
    const speakerId = submission.speaker_id;
    if (!submissionsBySpeakerId.has(speakerId)) {
      submissionsBySpeakerId.set(speakerId, []);
    }
    submissionsBySpeakerId.get(speakerId)!.push(submission);
  }

  // Merge speakers with their submissions
  return speakers.map((speaker) => ({
    ...speaker,
    submissions: (submissionsBySpeakerId.get(speaker.id) || []).map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      submission_type: s.submission_type,
    })),
  }));
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

/**
 * Get all reviewers with activity metrics
 * Single efficient query with aggregations
 */
export async function getAdminReviewersWithActivity(): Promise<CfpAdminReviewerWithActivity[]> {
  const supabase = createCfpServiceClient();

  // Get reviewers and reviews in parallel
  const [reviewersResult, reviewsResult] = await Promise.all([
    supabase
      .from('cfp_reviewers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('cfp_reviews')
      .select('reviewer_id, score_overall, created_at'),
  ]);

  if (reviewersResult.error) {
    console.error('[CFP Admin] Error fetching reviewers:', reviewersResult.error);
    return [];
  }

  const reviewers = reviewersResult.data || [];
  const reviews = reviewsResult.data || [];

  // Calculate 7 days ago threshold
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // Group reviews by reviewer_id for efficient aggregation
  const reviewsByReviewer = new Map<string, typeof reviews>();
  for (const review of reviews) {
    const reviewerId = review.reviewer_id;
    if (!reviewsByReviewer.has(reviewerId)) {
      reviewsByReviewer.set(reviewerId, []);
    }
    reviewsByReviewer.get(reviewerId)!.push(review);
  }

  // Build enhanced reviewer data
  const result: CfpAdminReviewerWithActivity[] = reviewers.map((reviewer) => {
    const reviewerReviews = reviewsByReviewer.get(reviewer.id as string) || [];
    const totalReviews = reviewerReviews.length;
    const reviewsLast7Days = reviewerReviews.filter(
      (r) => r.created_at >= sevenDaysAgoISO
    ).length;

    // Find last activity (most recent review)
    let lastActivityAt: string | null = null;
    for (const r of reviewerReviews) {
      if (!lastActivityAt || r.created_at > lastActivityAt) {
        lastActivityAt = r.created_at as string;
      }
    }

    // Calculate average score given
    const scores = reviewerReviews
      .map((r) => r.score_overall)
      .filter((s): s is number => s !== null);
    const avgScoreGiven = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

    return {
      id: reviewer.id as string,
      email: reviewer.email as string,
      name: reviewer.name as string | null,
      role: reviewer.role as string,
      is_active: reviewer.is_active as boolean,
      can_see_speaker_identity: reviewer.can_see_speaker_identity as boolean,
      accepted_at: reviewer.accepted_at as string | null,
      created_at: reviewer.created_at as string,
      total_reviews: totalReviews,
      reviews_last_7_days: reviewsLast7Days,
      last_activity_at: lastActivityAt,
      avg_score_given: avgScoreGiven,
    };
  });

  return result;
}

/**
 * Get reviewer activity (reviews with submission titles)
 */
export async function getReviewerActivity(
  reviewerId: string,
  dateRange?: '7d' | '30d' | 'all'
): Promise<{ activities: CfpReviewerActivity[]; total: number }> {
  const supabase = createCfpServiceClient();

  // Build date filter
  let dateFilter: string | null = null;
  if (dateRange === '7d') {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    dateFilter = date.toISOString();
  } else if (dateRange === '30d') {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    dateFilter = date.toISOString();
  }

  // Get reviews for this reviewer
  let reviewsQuery = supabase
    .from('cfp_reviews')
    .select('id, submission_id, score_overall, private_notes, created_at', { count: 'exact' })
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false });

  if (dateFilter) {
    reviewsQuery = reviewsQuery.gte('created_at', dateFilter);
  }

  const { data: reviews, count, error } = await reviewsQuery;

  if (error || !reviews) {
    console.error('[CFP Admin] Error fetching reviewer activity:', error);
    return { activities: [], total: 0 };
  }

  // Batch fetch submission titles
  const submissionIds = [...new Set(reviews.map((r) => r.submission_id))];
  const { data: submissions } = await supabase
    .from('cfp_submissions')
    .select('id, title')
    .in('id', submissionIds);

  const submissionMap = new Map(
    (submissions || []).map((s) => [s.id, s.title])
  );

  // Build activity list
  const activities: CfpReviewerActivity[] = reviews.map((review) => ({
    id: review.id,
    submission_id: review.submission_id,
    submission_title: submissionMap.get(review.submission_id) || 'Unknown',
    score_overall: review.score_overall,
    private_notes: review.private_notes,
    created_at: review.created_at,
  }));

  return { activities, total: count || 0 };
}

/**
 * Get CFP insights (aggregated statistics)
 */
export async function getCfpInsights(): Promise<CfpInsights> {
  const supabase = createCfpServiceClient();

  // Get all submissions with their reviews in parallel
  const [submissionsResult, reviewsResult, reviewersCountResult] = await Promise.all([
    supabase
      .from('cfp_submissions')
      .select('id'),
    supabase
      .from('cfp_reviews')
      .select('submission_id, score_overall, created_at'),
    supabase
      .from('cfp_reviewers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  const submissions = submissionsResult.data || [];
  const reviews = reviewsResult.data || [];
  const totalReviewers = reviewersCountResult.count || 0;

  // Group reviews by submission
  const reviewsBySubmission = new Map<string, ReviewInput[]>();
  for (const review of reviews) {
    const submissionId = review.submission_id as string;
    if (!reviewsBySubmission.has(submissionId)) {
      reviewsBySubmission.set(submissionId, []);
    }
    reviewsBySubmission.get(submissionId)!.push({
      score_overall: review.score_overall as number | null,
      created_at: review.created_at as string,
    });
  }

  // Initialize counters
  const byStatus: Record<ShortlistStatus, number> = {
    likely_shortlisted: 0,
    needs_more_reviews: 0,
    likely_reject: 0,
    borderline: 0,
  };

  const byScoreBucket: Record<string, number> = {
    '0-1.99': 0,
    '2-2.99': 0,
    '3-3.49': 0,
    '3.5-4': 0,
  };

  const byCoverageBucket: Record<string, number> = {
    '0-24': 0,
    '25-49': 0,
    '50-74': 0,
    '75-100': 0,
  };

  // Process each submission using the scoring utility
  for (const submission of submissions) {
    const submissionReviews = reviewsBySubmission.get(submission.id as string) || [];
    const scoring = computeSubmissionScoring(submissionReviews, totalReviewers);

    // Count by status
    byStatus[scoring.status]++;

    // Count by score bucket (only if there's a score)
    const scoreBucket = getScoreBucket(scoring.avgScore);
    if (scoreBucket) {
      byScoreBucket[scoreBucket]++;
    }

    // Count by coverage bucket
    const coverageBucket = getCoverageBucket(scoring.coveragePercent);
    byCoverageBucket[coverageBucket]++;
  }

  return {
    byStatus,
    byScoreBucket,
    byCoverageBucket,
  };
}
