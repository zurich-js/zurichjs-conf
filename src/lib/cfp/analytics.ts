/**
 * CFP Analytics
 * Compute aggregate analytics for the CFP admin dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type {
  CfpAnalytics,
  CfpFunnelData,
  CfpTypeBreakdown,
  CfpLevelBreakdown,
  CfpDemographics,
  CfpLogistics,
  CfpReviewActivity,
  CfpTimelineEntry,
  CfpTagCount,
} from '../types/cfp-analytics';

function createCfpServiceClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getCfpAnalytics(): Promise<CfpAnalytics> {
  const supabase = createCfpServiceClient();

  // Fetch all data in parallel
  const [
    submissionsResult,
    speakersResult,
    reviewsResult,
    tagJoinsResult,
    tagsResult,
  ] = await Promise.all([
    supabase.from('cfp_submissions').select('id, status, submission_type, talk_level, speaker_id, created_at, submitted_at'),
    supabase.from('cfp_speakers').select('id, first_name, last_name, company, country, city, bio, profile_image_url, travel_assistance_required, assistance_type, departure_airport, special_requirements, company_interested_in_sponsoring'),
    supabase.from('cfp_reviews').select('id, submission_id, score_overall, created_at'),
    supabase.from('cfp_submission_tags').select('submission_id, tag_id'),
    supabase.from('cfp_tags').select('id, name'),
  ]);

  const submissions = (submissionsResult.data || []) as Array<{
    id: string;
    status: string;
    submission_type: string;
    talk_level: string;
    speaker_id: string;
    created_at: string;
    submitted_at: string | null;
  }>;

  const speakers = (speakersResult.data || []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    company: string | null;
    country: string | null;
    city: string | null;
    bio: string | null;
    profile_image_url: string | null;
    travel_assistance_required: boolean | null;
    assistance_type: 'travel' | 'accommodation' | 'both' | null;
    departure_airport: string | null;
    special_requirements: string | null;
    company_interested_in_sponsoring: boolean | null;
  }>;

  const reviews = (reviewsResult.data || []) as Array<{
    id: string;
    submission_id: string;
    score_overall: number | null;
    created_at: string;
  }>;

  const tagJoins = (tagJoinsResult.data || []) as Array<{
    submission_id: string;
    tag_id: string;
  }>;

  const tags = (tagsResult.data || []) as Array<{
    id: string;
    name: string;
  }>;

  // Build lookup maps
  const reviewsBySubmission = new Map<string, typeof reviews>();
  for (const r of reviews) {
    if (!reviewsBySubmission.has(r.submission_id)) {
      reviewsBySubmission.set(r.submission_id, []);
    }
    reviewsBySubmission.get(r.submission_id)!.push(r);
  }

  const tagNameMap = new Map(tags.map((t) => [t.id, t.name]));

  // --- Funnel ---
  const funnel: CfpFunnelData = {
    draft: 0, submitted: 0, under_review: 0, shortlisted: 0,
    accepted: 0, rejected: 0, waitlisted: 0, withdrawn: 0,
  };
  for (const s of submissions) {
    if (s.status in funnel) {
      funnel[s.status as keyof CfpFunnelData]++;
    }
  }

  // --- By Type ---
  const byType = buildTypeBreakdown(submissions, reviewsBySubmission);

  // --- By Level ---
  const byLevel = buildLevelBreakdown(submissions, reviewsBySubmission);

  // --- Demographics ---
  const demographics = buildDemographics(speakers, submissions);

  // --- Logistics ---
  const logistics = buildLogistics(speakers);

  // --- Review Activity ---
  const reviewActivity = buildReviewActivity(reviews, submissions.length);

  // --- Submission Timeline ---
  const submissionTimeline = buildTimeline(submissions);

  // --- Top Tags ---
  const topTags = buildTopTags(tagJoins, tagNameMap);

  return {
    funnel,
    byType,
    byLevel,
    demographics,
    logistics,
    reviewActivity,
    submissionTimeline,
    topTags,
  };
}

function avgScoreForSubmissions(
  ids: string[],
  reviewsBySubmission: Map<string, Array<{ score_overall: number | null }>>
): number | null {
  const scores: number[] = [];
  for (const id of ids) {
    const revs = reviewsBySubmission.get(id) || [];
    for (const r of revs) {
      if (r.score_overall !== null) scores.push(r.score_overall);
    }
  }
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

function buildTypeBreakdown(
  submissions: Array<{ id: string; status: string; submission_type: string }>,
  reviewsBySubmission: Map<string, Array<{ score_overall: number | null }>>
): CfpTypeBreakdown {
  const types = ['lightning', 'standard', 'workshop'] as const;
  const result = {} as CfpTypeBreakdown;

  for (const type of types) {
    const matching = submissions.filter((s) => s.submission_type === type);
    const accepted = matching.filter((s) => s.status === 'accepted');
    result[type] = {
      total: matching.length,
      accepted: accepted.length,
      avgScore: avgScoreForSubmissions(matching.map((s) => s.id), reviewsBySubmission),
    };
  }
  return result;
}

function buildLevelBreakdown(
  submissions: Array<{ id: string; status: string; talk_level: string }>,
  reviewsBySubmission: Map<string, Array<{ score_overall: number | null }>>
): CfpLevelBreakdown {
  const levels = ['beginner', 'intermediate', 'advanced'] as const;
  const result = {} as CfpLevelBreakdown;

  for (const level of levels) {
    const matching = submissions.filter((s) => s.talk_level === level);
    const accepted = matching.filter((s) => s.status === 'accepted');
    result[level] = {
      total: matching.length,
      accepted: accepted.length,
      avgScore: avgScoreForSubmissions(matching.map((s) => s.id), reviewsBySubmission),
    };
  }
  return result;
}

function buildDemographics(
  speakers: Array<{
    id: string;
    company: string | null;
    country: string | null;
    bio: string | null;
    profile_image_url: string | null;
    company_interested_in_sponsoring: boolean | null;
  }>,
  submissions: Array<{ speaker_id: string }>
): CfpDemographics {
  const profileComplete = speakers.filter((s) => s.bio && s.profile_image_url).length;

  // Country counts
  const countryCounts = new Map<string, number>();
  for (const s of speakers) {
    if (s.country) {
      countryCounts.set(s.country, (countryCounts.get(s.country) || 0) + 1);
    }
  }
  const topCountries = [...countryCounts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Company counts
  const companyCounts = new Map<string, number>();
  for (const s of speakers) {
    if (s.company) {
      companyCounts.set(s.company, (companyCounts.get(s.company) || 0) + 1);
    }
  }
  const topCompanies = [...companyCounts.entries()]
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Submissions per speaker
  const submissionsBySpeaker = new Map<string, number>();
  for (const sub of submissions) {
    submissionsBySpeaker.set(sub.speaker_id, (submissionsBySpeaker.get(sub.speaker_id) || 0) + 1);
  }
  const multiSubmissionSpeakers = [...submissionsBySpeaker.values()].filter((c) => c > 1).length;

  return {
    totalSpeakers: speakers.length,
    profileComplete,
    profileIncomplete: speakers.length - profileComplete,
    topCountries,
    topCompanies,
    sponsorInterestCount: speakers.filter((s) => s.company_interested_in_sponsoring).length,
    avgSubmissionsPerSpeaker: speakers.length > 0 ? submissions.length / speakers.length : 0,
    multiSubmissionSpeakers,
  };
}

function buildLogistics(
  speakers: Array<{
    travel_assistance_required: boolean | null;
    assistance_type: 'travel' | 'accommodation' | 'both' | null;
    departure_airport: string | null;
    special_requirements: string | null;
  }>
): CfpLogistics {
  const needTravel = speakers.filter((s) => s.travel_assistance_required);

  const assistanceBreakdown = { travel: 0, accommodation: 0, both: 0 };
  for (const s of needTravel) {
    if (s.assistance_type && s.assistance_type in assistanceBreakdown) {
      assistanceBreakdown[s.assistance_type]++;
    }
  }

  // Airports
  const airportCounts = new Map<string, number>();
  for (const s of speakers) {
    if (s.departure_airport) {
      const code = s.departure_airport.toUpperCase().trim();
      airportCounts.set(code, (airportCounts.get(code) || 0) + 1);
    }
  }
  const topAirports = [...airportCounts.entries()]
    .map(([airport, count]) => ({ airport, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    travelAssistanceNeeded: needTravel.length,
    assistanceBreakdown,
    topAirports,
    specialRequirementsCount: speakers.filter((s) => s.special_requirements).length,
  };
}

function buildReviewActivity(
  reviews: Array<{ id: string; score_overall: number | null; created_at: string; submission_id: string }>,
  totalSubmissions: number
): CfpReviewActivity {
  const scores = reviews.map((r) => r.score_overall).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Score distribution in 0.5 increments from 0 to 4
  const scoreRanges = [
    { range: '0-0.5', min: 0, max: 0.5 },
    { range: '0.5-1', min: 0.5, max: 1 },
    { range: '1-1.5', min: 1, max: 1.5 },
    { range: '1.5-2', min: 1.5, max: 2 },
    { range: '2-2.5', min: 2, max: 2.5 },
    { range: '2.5-3', min: 2.5, max: 3 },
    { range: '3-3.5', min: 3, max: 3.5 },
    { range: '3.5-4', min: 3.5, max: 4 },
  ];
  const scoreDistribution = scoreRanges.map(({ range, min, max }) => ({
    range,
    count: scores.filter((s) => s >= min && (max === 4 ? s <= max : s < max)).length,
  }));

  // Reviews per day (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dayCounts = new Map<string, number>();
  for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    dayCounts.set(d.toISOString().split('T')[0], 0);
  }
  for (const r of reviews) {
    const day = r.created_at.split('T')[0];
    if (dayCounts.has(day)) {
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }
  }
  const reviewsPerDay = [...dayCounts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Unreviewed submissions
  const reviewedSubmissions = new Set(reviews.map((r) => r.submission_id));
  const unreviewed = totalSubmissions - reviewedSubmissions.size;

  return {
    totalReviews: reviews.length,
    avgScore,
    scoreDistribution,
    reviewsPerDay,
    avgReviewsPerSubmission: totalSubmissions > 0 ? reviews.length / totalSubmissions : 0,
    unreviewed,
  };
}

function buildTimeline(
  submissions: Array<{ created_at: string }>
): CfpTimelineEntry[] {
  if (submissions.length === 0) return [];

  // Group by day
  const dayCounts = new Map<string, number>();
  for (const s of submissions) {
    const day = s.created_at.split('T')[0];
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }

  const sorted = [...dayCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  return sorted.map(([date, count]) => {
    cumulative += count;
    return { date, submissions: count, cumulative };
  });
}

function buildTopTags(
  tagJoins: Array<{ tag_id: string }>,
  tagNameMap: Map<string, string>
): CfpTagCount[] {
  const counts = new Map<string, number>();
  for (const j of tagJoins) {
    const name = tagNameMap.get(j.tag_id);
    if (name) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}
