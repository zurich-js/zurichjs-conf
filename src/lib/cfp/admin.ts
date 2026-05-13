/**
 * CFP Admin Operations
 * Functions for managing CFP as an admin
 */

import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
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
} from '../types/cfp-admin';
import {
  computeSubmissionScoring,
  getScoreBucket,
  getCoverageBucket,
  type ShortlistStatus,
  type ReviewInput,
} from './scoring';
import { computeReviewerContributionMetrics } from './reviewer-scoring';

/**
 * Fetch all rows from a table by paginating with .range().
 * PostgREST's max-rows config (default 1000) silently caps .limit(),
 * so we page through in chunks to guarantee all rows are returned.
 */
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

/**
 * Get submissions with server-side filtering, sorting, and pagination.
 *
 * DB-level filters: status, submission_type, talk_level
 * In-memory filters (after stats enrichment): search (topic content), min_review_count,
 *   shortlist_only, shortlist_statuses, coverage range
 * In-memory sorting: multi-sort and legacy single-sort options including stats-based metrics
 * Pagination: applied last, returns one page + total filtered count
 */
export async function getAdminSubmissions(
  filters: CfpSubmissionFilters = {}
): Promise<{ submissions: CfpSubmissionWithStats[]; total: number; totalUnfiltered: number }> {
  const supabase = createCfpServiceClient();
  const {
    status,
    submission_type,
    talk_level,
    search,
    sort,
    sort_by = 'created_at',
    sort_order = 'desc',
    limit = 10,
    offset = 0,
    min_review_count,
    shortlist_only,
    shortlist_statuses,
    coverage_min,
    coverage_max,
    decision_statuses,
    email_states,
  } = filters;

  // Step 1: Fetch all submissions from DB (apply DB-level filters only)
  // Paginate with .range() to bypass PostgREST max-rows cap (default 1000)
  const PAGE_SIZE = 1000;
  const submissions: CfpSubmission[] = [];
  let pageOffset = 0;

   
  while (true) {
    let query = supabase
      .from('cfp_submissions')
      .select('*')
      .range(pageOffset, pageOffset + PAGE_SIZE - 1);

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

    const { data, error } = await query;

    if (error) {
      console.error('[CFP Admin] Error fetching submissions:', error);
      return { submissions: [], total: 0, totalUnfiltered: 0 };
    }
    if (!data || data.length === 0) break;

    submissions.push(...(data as CfpSubmission[]));
    if (data.length < PAGE_SIZE) break;
    pageOffset += PAGE_SIZE;
  }

  // Step 2: Fetch related data in parallel
  // Use paginated fetches (fetchAllRows) to bypass PostgREST max-rows cap.
  // No .in() filters to avoid URL length limits with 1000+ IDs.
  // We filter in-memory via Sets/Maps.
  const allSubmissionIds = new Set(submissions.map((s: { id: string }) => s.id));
  const speakerIdSet = new Set(submissions.map((s: { speaker_id: string }) => s.speaker_id));

  const [speakersResult, tagJoinsResult, reviewsResult, reviewerCountResult, scheduledEmailsResult] = await Promise.all([
    fetchAllRows<CfpSpeaker>(supabase, 'cfp_speakers', '*'),
    fetchAllRows<{ submission_id: string; tag_id: string }>(supabase, 'cfp_submission_tags', 'submission_id, tag_id'),
    fetchAllRows<{ submission_id: string; score_overall: number | null; created_at: string }>(
      supabase, 'cfp_reviews', 'submission_id, score_overall, created_at'
    ),
    supabase
      .from('cfp_reviewers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    fetchAllRows<{ submission_id: string; status: string; email_type: string; created_at: string; scheduled_for: string | null }>(
      supabase, 'cfp_scheduled_emails', 'submission_id, status, email_type, created_at, scheduled_for'
    ),
  ]);

  // Log errors from parallel queries for debugging
  if (speakersResult.error) console.error('[CFP Admin] Error fetching speakers:', speakersResult.error);
  if (tagJoinsResult.error) console.error('[CFP Admin] Error fetching tag joins:', tagJoinsResult.error);
  if (reviewsResult.error) console.error('[CFP Admin] Error fetching reviews:', reviewsResult.error);
  if (reviewerCountResult.error) console.error('[CFP Admin] Error fetching reviewer count:', reviewerCountResult.error);
  if (scheduledEmailsResult.error) console.error('[CFP Admin] Error fetching scheduled emails:', scheduledEmailsResult.error);

  // Build latest-scheduled-email-status map (picks the most recent record per submission)
  // For list filtering, treat overdue pending emails as effectively sent without
  // mutating records during this read-only endpoint.
  const nowIso = new Date().toISOString();
  const latestScheduledEmailBySubmission = new Map<string, 'pending' | 'sent' | 'cancelled' | 'failed'>();
  const latestScheduledEmailCreatedAt = new Map<string, string>();
  for (const row of scheduledEmailsResult.data || []) {
    if (!allSubmissionIds.has(row.submission_id)) continue;
    const prev = latestScheduledEmailCreatedAt.get(row.submission_id);
    if (!prev || row.created_at > prev) {
      latestScheduledEmailCreatedAt.set(row.submission_id, row.created_at);
      const effectiveStatus =
        row.status === 'pending' && row.scheduled_for && row.scheduled_for <= nowIso
          ? 'sent'
          : row.status;
      latestScheduledEmailBySubmission.set(
        row.submission_id,
        effectiveStatus as 'pending' | 'sent' | 'cancelled' | 'failed'
      );
    }
  }

  // Build speaker map (filter to only speakers we need)
  const speakerMap: Record<string, CfpSpeaker> = Object.fromEntries(
    (speakersResult.data || [])
      .filter((s: CfpSpeaker) => speakerIdSet.has(s.id))
      .map((s: CfpSpeaker) => [s.id, s])
  );

  // Build tag map (filter tag joins to only our submissions)
  const tagJoins = (tagJoinsResult.data || []).filter(
    (j: { submission_id: string }) => allSubmissionIds.has(j.submission_id)
  );
  const tagIds = [...new Set(tagJoins.map((j: { tag_id: string }) => j.tag_id))];
  let tagMap: Record<string, CfpTag> = {};
  if (tagIds.length > 0) {
    const { data: tags } = await supabase
      .from('cfp_tags')
      .select('*')
      .in('id', tagIds);
    tagMap = Object.fromEntries((tags || []).map((t: CfpTag) => [t.id, t]));
  }

  // Build reviews-by-submission map (filter to only our submissions)
  const totalReviewerCount = reviewerCountResult.count || 0;
  const reviewsBySubmission = new Map<string, ReviewInput[]>();
  for (const review of reviewsResult.data || []) {
    const submissionId = review.submission_id as string;
    if (!allSubmissionIds.has(submissionId)) continue;
    if (!reviewsBySubmission.has(submissionId)) {
      reviewsBySubmission.set(submissionId, []);
    }
    reviewsBySubmission.get(submissionId)!.push({
      score_overall: review.score_overall as number | null,
      created_at: review.created_at as string,
    });
  }

  // Step 3: Build enriched submissions with stats
  const enriched: CfpSubmissionWithStats[] = submissions.map((s: CfpSubmission) => {
    const submissionReviews = reviewsBySubmission.get(s.id) || [];
    const scoring = computeSubmissionScoring(submissionReviews, totalReviewerCount);

    const submissionTagIds = tagJoins
      .filter((j: { submission_id: string }) => j.submission_id === s.id)
      .map((j: { tag_id: string }) => j.tag_id);

    return {
      ...s,
      speaker: speakerMap[s.speaker_id],
      tags: submissionTagIds.map((tid: string) => tagMap[tid]).filter(Boolean),
      latest_scheduled_email_status: latestScheduledEmailBySubmission.get(s.id) ?? null,
      stats: {
        submission_id: s.id,
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
      },
    } as CfpSubmissionWithStats;
  });

  // totalUnfiltered = count after DB-level filters only (before search/min_reviews/shortlist)
  const totalUnfiltered = enriched.length;

  // Step 4: Apply in-memory filters (search, min_review_count, shortlist_only)
  let filtered = enriched;

  if (search && search.trim()) {
    const searchFilters = parseSearchQuery(search);
    filtered = filtered.filter((s) => matchesSearch(s, searchFilters));
  }

  if (min_review_count && min_review_count > 0) {
    filtered = filtered.filter((s) => (s.stats?.review_count || 0) >= min_review_count);
  }

  if (shortlist_only) {
    filtered = filtered.filter((s) => s.stats?.shortlist_status === 'likely_shortlisted');
  }

  if (shortlist_statuses && shortlist_statuses.length > 0) {
    const shortlistSet = new Set(shortlist_statuses);
    filtered = filtered.filter((s) => shortlistSet.has(s.stats?.shortlist_status || ''));
  }

  if (typeof coverage_min === 'number') {
    filtered = filtered.filter((s) => (s.stats?.coverage_percent || 0) >= coverage_min);
  }

  if (typeof coverage_max === 'number') {
    filtered = filtered.filter((s) => (s.stats?.coverage_percent || 0) <= coverage_max);
  }

  if (decision_statuses && decision_statuses.length > 0) {
    const decisionSet = new Set(decision_statuses);
    filtered = filtered.filter((s) => {
      const current = s.decision_status || 'undecided';
      return decisionSet.has(current);
    });
  }

  if (email_states && email_states.length > 0) {
    const stateSet = new Set(email_states);
    filtered = filtered.filter((s) => {
      const status = s.latest_scheduled_email_status;
      // Collapse the scheduled-email status into three user-facing buckets.
      const bucket = status === 'sent'
        ? 'sent'
        : status === 'pending'
          ? 'pending'
          : 'not_scheduled';
      return stateSet.has(bucket);
    });
  }

  const total = filtered.length;

  // Step 5: Sort (supports multi-sort and legacy single-sort fallback)
  const sortRules = sort && sort.length > 0
    ? sort
    : [{ key: sort_by, direction: sort_order }];

  const shortlistRank: Record<string, number> = {
    unlikely_shortlisted: 0,
    maybe_shortlisted: 1,
    likely_shortlisted: 2,
  };

  const compareByRule = (
    a: CfpSubmissionWithStats,
    b: CfpSubmissionWithStats,
    key: NonNullable<CfpSubmissionFilters['sort_by']>
  ) => {
    switch (key) {
      case 'created_at':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'speaker': {
        const aName = `${a.speaker?.first_name || ''} ${a.speaker?.last_name || ''}`.trim();
        const bName = `${b.speaker?.first_name || ''} ${b.speaker?.last_name || ''}`.trim();
        return aName.localeCompare(bName);
      }
      case 'review_count':
        return (a.stats?.review_count || 0) - (b.stats?.review_count || 0);
      case 'avg_score':
        return (a.stats?.avg_overall || 0) - (b.stats?.avg_overall || 0);
      case 'coverage':
        return (a.stats?.coverage_percent || 0) - (b.stats?.coverage_percent || 0);
      case 'shortlist':
        return (shortlistRank[a.stats?.shortlist_status || ''] ?? -1) - (shortlistRank[b.stats?.shortlist_status || ''] ?? -1);
      case 'last_reviewed': {
        const aTime = a.stats?.last_reviewed_at ? new Date(a.stats.last_reviewed_at).getTime() : 0;
        const bTime = b.stats?.last_reviewed_at ? new Date(b.stats.last_reviewed_at).getTime() : 0;
        return aTime - bTime;
      }
      default:
        return 0;
    }
  };

  filtered.sort((a, b) => {
    for (const rule of sortRules) {
      const cmp = compareByRule(a, b, rule.key);
      if (cmp !== 0) {
        return rule.direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });

  // Step 6: Paginate — return only the requested page
  const page = filtered.slice(offset, offset + limit);

  return { submissions: page, total, totalUnfiltered };
}

/**
 * Parse advanced search query with support for quoted phrases and exclusions.
 * e.g., 'react -"beginner" "event sourcing"' →
 *   include: ["react", "event sourcing"], exclude: ["beginner"]
 */
function parseSearchQuery(search: string): { include: string[]; exclude: string[] } {
  const filters = { include: [] as string[], exclude: [] as string[] };
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

    if (isExclude) filters.exclude.push(normalized);
    else filters.include.push(normalized);
  }

  return filters;
}

/**
 * Match a submission against search filters (searches title and submission content fields)
 */
function matchesSearch(
  submission: CfpSubmissionWithStats,
  filters: { include: string[]; exclude: string[] }
): boolean {
  const tags = (submission.tags || []).map((tag) => tag.name).join(' ');
  const haystack = [
    submission.title,
    submission.abstract,
    submission.outline || '',
    submission.additional_notes || '',
    submission.workshop_special_requirements || '',
    tags,
  ].join(' ').toLowerCase();

  if (filters.include.some((term) => !haystack.includes(term))) return false;
  if (filters.exclude.some((term) => haystack.includes(term))) return false;
  return true;
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

  // Calculate 7 days ago for active reviewers query
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // Run all queries in parallel for maximum efficiency
  // - Submissions: need rows for by-status/type/level breakdown (use count: 'exact' for true total)
  // - Reviews: only fetch last 7 days for active_reviewers metric; use count for total
  // - Speakers & reviewers: count-only queries (head: true = no rows fetched)
  const [submissionsResult, totalReviewsResult, recentReviewsResult, speakersResult, reviewersResult] = await Promise.all([
    fetchAllRows<{ id: string; status: CfpSubmissionStatus; submission_type: string; talk_level: string; travel_assistance_required: boolean }>(
      supabase, 'cfp_submissions', 'id, status, submission_type, talk_level, travel_assistance_required'
    ),
    supabase
      .from('cfp_reviews')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('cfp_reviews')
      .select('reviewer_id')
      .gte('created_at', sevenDaysAgoISO)
      .range(0, 4999),
    supabase
      .from('cfp_speakers')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('cfp_reviewers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  const submissions = submissionsResult.data || [];
  const totalSubmissionsCount = submissions.length;
  const totalReviews = totalReviewsResult.count || 0;
  const totalSpeakers = speakersResult.count || 0;
  const totalReviewers = reviewersResult.count || 0;

  // Active reviewers = unique reviewer_ids from reviews in last 7 days
  const recentReviewerIds = new Set(
    (recentReviewsResult.data || []).map((r: { reviewer_id: string }) => r.reviewer_id)
  );
  const activeReviewers7d = recentReviewerIds.size;

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  let travelRequested = 0;

  for (const s of submissions) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byType[s.submission_type] = (byType[s.submission_type] || 0) + 1;
    byLevel[s.talk_level] = (byLevel[s.talk_level] || 0) + 1;
    if (s.travel_assistance_required) travelRequested++;
  }

  const acceptedCount = byStatus['accepted'] || 0;

  return {
    total_submissions: totalSubmissionsCount,
    submissions_by_status: byStatus as Record<CfpSubmissionStatus, number>,
    submissions_by_type: byType as Record<string, number>,
    submissions_by_level: byLevel as Record<string, number>,
    total_speakers: totalSpeakers,
    total_reviews: totalReviews,
    total_reviewers: totalReviewers,
    active_reviewers_7d: activeReviewers7d,
    avg_reviews_per_submission: totalSubmissionsCount > 0
      ? totalReviews / totalSubmissionsCount
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
  const { data, error } = await fetchAllRows<CfpReviewer>(supabase, 'cfp_reviewers', '*');
  if (error) {
    console.error('[CFP Admin] Error fetching reviewers:', error);
    return [];
  }
  return data;
}

/**
 * Get all speakers for admin
 */
export async function getAdminSpeakers(): Promise<CfpSpeaker[]> {
  const supabase = createCfpServiceClient();
  const { data, error } = await fetchAllRows<CfpSpeaker>(supabase, 'cfp_speakers', '*');
  if (error) {
    console.error('[CFP Admin] Error fetching speakers:', error);
    return [];
  }
  return data;
}

/**
 * Get all speakers with their submissions for admin (single query)
 * Avoids N+1 query problem by fetching all data in parallel
 */
type AdminSpeakerScope = 'all' | 'program';

function hasAcceptedSubmission(
  submissions: Array<{ status: string }>
): boolean {
  return submissions.some((submission) => submission.status === 'accepted');
}

export async function getAdminSpeakersWithSubmissions(scope: AdminSpeakerScope = 'all'): Promise<
  (CfpSpeaker & {
    submissions: {
      id: string;
      speaker_id: string;
      title: string;
      abstract: string | null;
      status: string;
      submission_type: string;
      talk_level: string | null;
      workshop_duration_hours: number | null;
      workshop_max_participants: number | null;
      scheduled_date: string | null;
      scheduled_start_time: string | null;
      scheduled_duration_minutes: number | null;
      room: string | null;
    }[];
  })[]
> {
  const supabase = createCfpServiceClient();

  // Fetch speakers and all submissions in parallel using paginated fetch
  const [speakersResult, submissionsResult, participantsResult] = await Promise.all([
    fetchAllRows<CfpSpeaker>(supabase, 'cfp_speakers', '*'),
    fetchAllRows<{
      id: string;
      title: string;
      abstract: string | null;
      status: string;
      submission_type: string;
      talk_level: string | null;
      workshop_duration_hours: number | null;
      workshop_max_participants: number | null;
      scheduled_date: string | null;
      scheduled_start_time: string | null;
      scheduled_duration_minutes: number | null;
      room: string | null;
      speaker_id: string;
      participant_speaker_ids?: string[];
    }>(
      supabase,
      'cfp_submissions',
      'id, title, abstract, status, submission_type, talk_level, workshop_duration_hours, workshop_max_participants, scheduled_date, scheduled_start_time, scheduled_duration_minutes, room, speaker_id'
    ),
    fetchAllRows<{ submission_id: string; speaker_id: string }>(
      supabase,
      'cfp_submission_speakers',
      'submission_id, speaker_id'
    ),
  ]);

  if (speakersResult.error) {
    console.error('[CFP Admin] Error fetching speakers:', speakersResult.error);
    return [];
  }

  const speakers = speakersResult.data;
  const submissions = submissionsResult.data;
  const participantRows = participantsResult.error ? [] : participantsResult.data;
  const participantsBySubmissionId = new Map<string, string[]>();

  for (const participant of participantRows) {
    if (!participantsBySubmissionId.has(participant.submission_id)) {
      participantsBySubmissionId.set(participant.submission_id, []);
    }
    participantsBySubmissionId.get(participant.submission_id)!.push(participant.speaker_id);
  }

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
  const speakersWithSubmissions = speakers.map((speaker) => ({
    ...speaker,
    submissions: (submissionsBySpeakerId.get(speaker.id) || []).map((s) => ({
      id: s.id,
      speaker_id: s.speaker_id,
      title: s.title,
      abstract: s.abstract,
      status: s.status,
      submission_type: s.submission_type,
      talk_level: s.talk_level,
      workshop_duration_hours: s.workshop_duration_hours,
      workshop_max_participants: s.workshop_max_participants,
      scheduled_date: s.scheduled_date,
      scheduled_start_time: s.scheduled_start_time,
      scheduled_duration_minutes: s.scheduled_duration_minutes,
      room: s.room,
      participant_speaker_ids: participantsBySubmissionId.get(s.id) || [],
    })),
  }));

  if (scope === 'program') {
    return speakersWithSubmissions.filter((speaker) =>
      speaker.is_admin_managed ||
      speaker.is_featured ||
      speaker.is_visible ||
      hasAcceptedSubmission(speaker.submissions)
    );
  }

  return speakersWithSubmissions;
}

/**
 * Get all tags for admin
 */
export async function getAdminTags(): Promise<CfpTag[]> {
  const supabase = createCfpServiceClient();
  const { data, error } = await fetchAllRows<CfpTag>(supabase, 'cfp_tags', '*');
  if (error) {
    console.error('[CFP Admin] Error fetching tags:', error);
    return [];
  }
  return data;
}

/**
 * Get all reviewers with activity metrics
 * Single efficient query with aggregations
 */
export async function getAdminReviewersWithActivity(): Promise<CfpAdminReviewerWithActivity[]> {
  const supabase = createCfpServiceClient();

  // Get reviewers and reviews in parallel using paginated fetch
  const [reviewersResult, reviewsResult] = await Promise.all([
    fetchAllRows<CfpReviewer>(supabase, 'cfp_reviewers', '*'),
    fetchAllRows<{
      reviewer_id: string;
      score_overall: number | null;
      score_relevance: number | null;
      score_technical_depth: number | null;
      score_clarity: number | null;
      score_diversity: number | null;
      private_notes: string | null;
      feedback_to_speaker: string | null;
      created_at: string;
    }>(
      supabase, 'cfp_reviews', 'reviewer_id, score_overall, score_relevance, score_technical_depth, score_clarity, score_diversity, private_notes, feedback_to_speaker, created_at'
    ),
  ]);

  if (reviewersResult.error) {
    console.error('[CFP Admin] Error fetching reviewers:', reviewersResult.error);
    return [];
  }

  // Filter to active reviewers in-memory (can't add .eq() to fetchAllRows)
  const reviewers = reviewersResult.data.filter((r) => r.is_active);
  const reviews = reviewsResult.data;

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
  const maxReviewCount = Math.max(
    0,
    ...reviewers.map((reviewer) => reviewsByReviewer.get(reviewer.id)?.length || 0)
  );

  // Build enhanced reviewer data
  const result: CfpAdminReviewerWithActivity[] = reviewers.map((reviewer) => {
    const reviewerReviews = reviewsByReviewer.get(reviewer.id) || [];
    const totalReviews = reviewerReviews.length;
    const reviewsLast7Days = reviewerReviews.filter(
      (r) => r.created_at >= sevenDaysAgoISO
    ).length;

    // Find last activity (most recent review)
    let lastActivityAt: string | null = null;
    for (const r of reviewerReviews) {
      if (!lastActivityAt || r.created_at > lastActivityAt) {
        lastActivityAt = r.created_at;
      }
    }

    // Calculate average score given
    const scores = reviewerReviews
      .map((r) => r.score_overall)
      .filter((s): s is number => s !== null);
    const avgScoreGiven = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
    const contribution = computeReviewerContributionMetrics(reviewerReviews, maxReviewCount);

    return {
      id: reviewer.id,
      email: reviewer.email,
      name: reviewer.name,
      role: reviewer.role,
      is_active: reviewer.is_active,
      can_see_speaker_identity: reviewer.can_see_speaker_identity,
      accepted_at: reviewer.accepted_at,
      created_at: reviewer.created_at,
      total_reviews: totalReviews,
      reviews_last_7_days: reviewsLast7Days,
      last_activity_at: lastActivityAt,
      avg_score_given: avgScoreGiven,
      feedback_written_count: contribution.feedbackWrittenCount,
      feedback_written_percent: contribution.feedbackWrittenPercent,
      rating_spread: contribution.ratingSpread,
      category_rating_spread: contribution.categoryRatingSpread,
      contribution_score: contribution.contributionScore,
      contribution_volume_score: contribution.volumeScore,
      contribution_feedback_score: contribution.feedbackScore,
      contribution_rating_spread_score: contribution.ratingSpreadScore,
      contribution_category_rating_spread_score: contribution.categoryRatingSpreadScore,
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
    .select(
      'id, submission_id, score_overall, score_relevance, score_technical_depth, score_clarity, score_diversity, private_notes, feedback_to_speaker, created_at',
      { count: 'exact' }
    )
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false })
    .range(0, 4999);

  if (dateFilter) {
    reviewsQuery = reviewsQuery.gte('created_at', dateFilter);
  }

  const { data: reviews, count, error } = await reviewsQuery;

  if (error || !reviews) {
    console.error('[CFP Admin] Error fetching reviewer activity:', error);
    return { activities: [], total: 0 };
  }

  // Fetch submission titles without .in() to avoid URL length limits on large reviewer histories
  const submissionIds = new Set(reviews.map((r) => r.submission_id).filter(Boolean));
  const { data: allSubmissions, error: submissionsError } = await fetchAllRows<{ id: string; title: string }>(
    supabase,
    'cfp_submissions',
    'id, title'
  );

  if (submissionsError) {
    console.error('[CFP Admin] Error fetching submissions for reviewer activity:', submissionsError);
  }

  const submissionMap = new Map(
    (allSubmissions || [])
      .filter((s) => submissionIds.has(s.id))
      .map((s) => [s.id, s.title])
  );

  // Build activity list
  const activities: CfpReviewerActivity[] = reviews.map((review) => ({
    id: review.id,
    submission_id: review.submission_id,
    submission_title: submissionMap.get(review.submission_id) || 'Unknown',
    score_overall: review.score_overall,
    score_relevance: review.score_relevance,
    score_technical_depth: review.score_technical_depth,
    score_clarity: review.score_clarity,
    score_diversity: review.score_diversity,
    private_notes: review.private_notes,
    feedback_to_speaker: review.feedback_to_speaker,
    created_at: review.created_at,
  }));

  return { activities, total: count || 0 };
}

/**
 * Get CFP insights (aggregated statistics)
 */
export async function getCfpInsights(): Promise<CfpInsights> {
  const supabase = createCfpServiceClient();

  // Get all submissions with their reviews in parallel using paginated fetch
  const [submissionsResult, reviewsResult, reviewersCountResult] = await Promise.all([
    fetchAllRows<{ id: string }>(supabase, 'cfp_submissions', 'id'),
    fetchAllRows<{ submission_id: string; score_overall: number | null; created_at: string }>(
      supabase, 'cfp_reviews', 'submission_id, score_overall, created_at'
    ),
    supabase
      .from('cfp_reviewers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  const submissions = submissionsResult.data;
  const reviews = reviewsResult.data;
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
