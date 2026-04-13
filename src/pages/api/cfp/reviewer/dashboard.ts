/**
 * Reviewer Dashboard API
 * GET /api/cfp/reviewer/dashboard - Get reviewer data and submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { computeSubmissionScoring } from '@/lib/cfp/scoring';
import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Reviewer Dashboard API');
const REVIEWER_DASHBOARD_STATUSES = ['submitted', 'under_review', 'shortlisted', 'waitlisted', 'accepted'] as const;

interface ReviewerDashboardReview {
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
}

async function fetchAllRows<T = Record<string, unknown>>(
  supabase: ReturnType<typeof createCfpServiceClient>,
  table: string,
  select: string,
  pageSize = 1000
): Promise<{ data: T[]; error: unknown | null }> {
  const allRows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(offset, offset + pageSize - 1);

    if (error) {
      return { data: allRows, error };
    }
    if (!data || data.length === 0) break;

    allRows.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return { data: allRows, error: null };
}

async function fetchReviewerReviews(
  supabase: ReturnType<typeof createCfpServiceClient>,
  reviewerId: string,
  pageSize = 1000
): Promise<{ data: ReviewerDashboardReview[]; error: unknown | null }> {
  const allRows: ReviewerDashboardReview[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('cfp_reviews')
      .select('id, submission_id, reviewer_id, score_overall, score_relevance, score_technical_depth, score_clarity, score_diversity, private_notes, feedback_to_speaker, created_at, updated_at')
      .eq('reviewer_id', reviewerId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      return { data: allRows, error };
    }
    if (!data || data.length === 0) break;

    allRows.push(...(data as ReviewerDashboardReview[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return { data: allRows, error: null };
}

interface SearchFilters {
  includeAny: string[];
  includeExact: string[];
  exclude: string[];
}

function parseSearchQuery(search: string): SearchFilters {
  const filters: SearchFilters = { includeAny: [], includeExact: [], exclude: [] };
  const tokens = search.match(/-?"[^"]+"|-?\S+/g) || [];

  for (const rawToken of tokens) {
    const isExclude = rawToken.startsWith('-');
    const token = isExclude ? rawToken.slice(1) : rawToken;
    if (!token) continue;

    const unquoted = token.startsWith('"') && token.endsWith('"')
      ? token.slice(1, -1)
      : token;
    const normalized = unquoted.trim().toLowerCase();
    if (!normalized) continue;

    if (isExclude) {
      filters.exclude.push(normalized);
      continue;
    }

    if (token.startsWith('"') && token.endsWith('"')) {
      filters.includeExact.push(normalized);
    } else {
      filters.includeAny.push(normalized);
    }
  }

  return filters;
}

function matchesSubmissionSearch(
  submission: { title: string; abstract: string; tags?: Array<{ name: string }> },
  filters: SearchFilters
): boolean {
  const tagNames = submission.tags?.map((tag) => tag.name).join(' ') || '';
  const haystack = `${submission.title} ${submission.abstract} ${tagNames}`.toLowerCase();

  if (filters.includeExact.some((term) => !haystack.includes(term))) {
    return false;
  }

  if (filters.includeAny.length > 0 && !filters.includeAny.some((term) => haystack.includes(term))) {
    return false;
  }

  if (filters.exclude.some((term) => haystack.includes(term))) {
    return false;
  }

  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const search = typeof req.body?.search === 'string' ? req.body.search : '';
    // Authenticate user from session - never trust request body for auth
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      log.warn('Authentication failed', { error: userError?.message });
      return res.status(401).json({ error: 'Unauthorized - please log in' });
    }

    const userId = user.id;
    const userEmail = user.email;
    log.info('Authenticated reviewer', { email: userEmail });

    // Get the reviewer record
    const reviewer = await getReviewerByUserId(userId);

    if (!reviewer) {
      log.warn('No reviewer found for user', { userId });
      return res.status(401).json({ error: 'Not authorized as a reviewer' });
    }

    log.info('Reviewer found', { email: reviewer.email, reviewerId: reviewer.id });

    // Fetch submissions for review
    const supabaseAdmin = createCfpServiceClient();

    // Get all reviewer-visible submissions (not drafts, withdrawn, or rejected)
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('cfp_submissions')
      .select(`
        *,
        tags:cfp_submission_tags(
          tag:cfp_tags(*)
        )
      `)
      .in('status', REVIEWER_DASHBOARD_STATUSES)
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      log.error('Error fetching submissions', submissionsError);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }

    const submissionIds = (submissions || []).map((submission) => submission.id);

    // Get this reviewer's reviews
    const { data: myReviews, error: reviewsError } = await fetchReviewerReviews(supabaseAdmin, reviewer.id);

    if (reviewsError) {
      log.error('Error fetching reviews', reviewsError);
    }

    // Get review stats for each submission
    const { data: reviewStats, error: statsError } = await fetchAllRows<{
      submission_id: string;
      score_overall: number | null;
      created_at: string;
    }>(
      supabaseAdmin,
      'cfp_reviews',
      'submission_id, score_overall, created_at'
    );

    if (statsError) {
      log.error('Error fetching stats', statsError);
    }

    const { count: totalReviewers, error: reviewerCountError } = await supabaseAdmin
      .from('cfp_reviewers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (reviewerCountError) {
      log.error('Error fetching reviewer count', reviewerCountError);
    }

    // Create a map of my reviews by submission_id
    const submissionIdSet = new Set(submissionIds);
    const myReviewsMap = new Map(
      (myReviews || [])
        .filter((review) => submissionIdSet.has(review.submission_id))
        .map((review) => [review.submission_id, review])
    );

    // Calculate stats per submission
    const totalReviewerCount = totalReviewers || 0;
    const statsMap = new Map<string, {
      review_count: number;
      avg_overall: number | null;
      total_reviewers: number;
      coverage_ratio: number;
      coverage_percent: number;
    }>();
    if (reviewStats) {
      const grouped = reviewStats.reduce((acc, review) => {
        if (!acc[review.submission_id]) {
          acc[review.submission_id] = [];
        }
        acc[review.submission_id].push({
          score_overall: review.score_overall,
          created_at: review.created_at,
        });
        return acc;
      }, {} as Record<string, Array<{ score_overall: number | null; created_at: string }>>);

      for (const [submissionId, reviews] of Object.entries(grouped)) {
        const scoring = computeSubmissionScoring(reviews, totalReviewerCount);
        statsMap.set(submissionId, {
          review_count: scoring.reviewCount,
          avg_overall: scoring.avgScore,
          total_reviewers: totalReviewerCount,
          coverage_ratio: scoring.coverageRatio,
          coverage_percent: scoring.coveragePercent,
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
        stats: statsMap.get(submission.id) || {
          review_count: 0,
          avg_overall: null,
          total_reviewers: totalReviewerCount,
          coverage_ratio: 0,
          coverage_percent: 0,
        },
      };
    });

    const searchFilters = search.trim() ? parseSearchQuery(search) : null;
    const filteredSubmissions = searchFilters
      ? formattedSubmissions.filter((submission) => matchesSubmissionSearch(submission, searchFilters))
      : formattedSubmissions;
    const reviewedCount = formattedSubmissions.filter((submission) => submission.my_review).length;

    log.info('Returning submissions', { count: filteredSubmissions.length, reviewerId: reviewer.id });

    return res.status(200).json({
      reviewer,
      submissions: filteredSubmissions,
      stats: {
        total: formattedSubmissions.length,
        reviewed: reviewedCount,
        pending: formattedSubmissions.length - reviewedCount,
      },
      total: filteredSubmissions.length,
    });
  } catch (error) {
    log.error('Error in reviewer dashboard', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
