/**
 * CFP Admin Speaker Feedback API
 * GET /api/admin/cfp/speakers/[id]/feedback
 *
 * Returns a unified view of all submissions, reviews, and analytics for a speaker,
 * used to explain CFP rejection/acceptance rationale to the speaker.
 *
 * Includes:
 *  - Committee reviews with aggregate scores per submission
 *  - Past-talk media (slides_url, previous_recording_url), outline, additional notes
 *  - Analytics: percentile vs. cohort, tag clash counts, score spread, feedback coverage
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { logger } from '@/lib/logger';
import type {
  SpeakerFeedbackAggregate,
  SpeakerFeedbackResponse,
  SpeakerFeedbackSubmission,
  SpeakerFeedbackSubmissionAnalytics,
  SpeakerFeedbackTagStat,
} from '@/lib/types/cfp-admin';

const log = logger.scope('CFP Admin Speaker Feedback API');

// Submission statuses that represent "in the CFP pool" and should count toward
// percentile/cohort analytics. Drafts and withdrawals do not reflect committee signal.
const COHORT_STATUSES = ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'waitlisted'];

function avg(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Rank-based percentile: percentage of cohort scores strictly less than the given score,
 * plus half the ties. Returns null when we can't compute (no cohort or null score).
 */
function percentile(score: number | null, cohort: number[]): number | null {
  if (score === null || cohort.length === 0) return null;
  const below = cohort.filter((s) => s < score).length;
  const equal = cohort.filter((s) => s === score).length;
  return ((below + equal / 2) / cohort.length) * 100;
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
    // Speaker's submissions with full detail (for media links etc.)
    const { data: submissions, error: submissionsError } = await supabase
      .from('cfp_submissions')
      .select(
        'id, title, abstract, submission_type, talk_level, status, submitted_at, created_at, slides_url, previous_recording_url, outline, additional_notes, decision_status, decision_email_sent_at'
      )
      .eq('speaker_id', id)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      log.error('Error fetching speaker submissions', submissionsError, { speakerId: id });
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }

    const submissionIds = (submissions || []).map((s) => s.id);

    // Reviews for the speaker's submissions
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

    // Reviewer display info
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

    // --- Cohort analytics ---
    // Pull the whole cohort's review scores in one pass, average per submission,
    // then use that distribution to compute percentiles for this speaker's submissions.
    const cohortScoreBySubmission = new Map<string, number>();
    {
      const { data: cohortSubmissions } = await supabase
        .from('cfp_submissions')
        .select('id')
        .in('status', COHORT_STATUSES);

      const cohortIds = (cohortSubmissions || []).map((s: { id: string }) => s.id);
      if (cohortIds.length > 0) {
        const { data: cohortReviews } = await supabase
          .from('cfp_reviews')
          .select('submission_id, score_overall')
          .in('submission_id', cohortIds)
          .not('score_overall', 'is', null);

        const bySubmission = new Map<string, number[]>();
        for (const r of cohortReviews || []) {
          if (r.score_overall === null) continue;
          const list = bySubmission.get(r.submission_id) || [];
          list.push(r.score_overall);
          bySubmission.set(r.submission_id, list);
        }
        for (const [sid, scores] of bySubmission.entries()) {
          if (scores.length > 0) {
            cohortScoreBySubmission.set(sid, scores.reduce((a, b) => a + b, 0) / scores.length);
          }
        }
      }
    }

    const cohortScores = Array.from(cohortScoreBySubmission.values());
    const cohortAvg = cohortScores.length > 0
      ? cohortScores.reduce((a, b) => a + b, 0) / cohortScores.length
      : null;

    // --- Tag analytics ---
    // Fetch tag joins for this speaker's submissions, plus global tag counts per tag id.
    const tagsBySubmission = new Map<string, SpeakerFeedbackTagStat[]>();
    if (submissionIds.length > 0) {
      const { data: tagJoins } = await supabase
        .from('cfp_submission_tags')
        .select('submission_id, tag_id')
        .in('submission_id', submissionIds);

      const speakerTagIds = [...new Set((tagJoins || []).map((j: { tag_id: string }) => j.tag_id))];

      const tagMeta = new Map<string, { id: string; name: string }>();
      if (speakerTagIds.length > 0) {
        const { data: tagRows } = await supabase
          .from('cfp_tags')
          .select('id, name')
          .in('id', speakerTagIds);
        for (const t of tagRows || []) {
          tagMeta.set(t.id, { id: t.id, name: t.name });
        }
      }

      // Global submission count per tag (how popular is this topic across the whole CFP)
      const tagCounts = new Map<string, number>();
      if (speakerTagIds.length > 0) {
        const { data: allJoins } = await supabase
          .from('cfp_submission_tags')
          .select('tag_id, submission_id')
          .in('tag_id', speakerTagIds);

        const perTag = new Map<string, Set<string>>();
        for (const j of allJoins || []) {
          const set = perTag.get(j.tag_id) || new Set<string>();
          set.add(j.submission_id);
          perTag.set(j.tag_id, set);
        }
        for (const [tagId, subs] of perTag.entries()) {
          tagCounts.set(tagId, subs.size);
        }
      }

      for (const join of tagJoins || []) {
        const meta = tagMeta.get(join.tag_id);
        if (!meta) continue;
        const list = tagsBySubmission.get(join.submission_id) || [];
        list.push({
          id: meta.id,
          name: meta.name,
          submission_count: tagCounts.get(meta.id) || 1,
        });
        tagsBySubmission.set(join.submission_id, list);
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
      const overallScores = subReviews
        .map((r) => r.score_overall)
        .filter((v): v is number => v !== null);
      const meanOverall = overallScores.length > 0
        ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length
        : null;

      const aggregate: SpeakerFeedbackAggregate = {
        overall: meanOverall,
        relevance: avg(subReviews.map((r) => r.score_relevance)),
        technical_depth: avg(subReviews.map((r) => r.score_technical_depth)),
        clarity: avg(subReviews.map((r) => r.score_clarity)),
        diversity: avg(subReviews.map((r) => r.score_diversity)),
      };

      const feedbackWrittenCount = subReviews.filter(
        (r) => (r.feedback_to_speaker && r.feedback_to_speaker.trim().length > 0)
          || (r.private_notes && r.private_notes.trim().length > 0)
      ).length;

      const analytics: SpeakerFeedbackSubmissionAnalytics = {
        percentile: percentile(meanOverall, cohortScores),
        cohort_size: cohortScores.length,
        cohort_avg: cohortAvg,
        score_min: overallScores.length > 0 ? Math.min(...overallScores) : null,
        score_max: overallScores.length > 0 ? Math.max(...overallScores) : null,
        score_stddev: stddev(overallScores),
        feedback_written_count: feedbackWrittenCount,
        feedback_written_percent: subReviews.length > 0
          ? (feedbackWrittenCount / subReviews.length) * 100
          : 0,
        decision_status: sub.decision_status ?? null,
        decision_email_sent_at: sub.decision_email_sent_at ?? null,
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
        slides_url: sub.slides_url ?? null,
        previous_recording_url: sub.previous_recording_url ?? null,
        outline: sub.outline ?? null,
        additional_notes: sub.additional_notes ?? null,
        tags: tagsBySubmission.get(sub.id) || [],
        analytics,
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

    const overallAvgAcrossAllReviews = avg(reviews.map((r) => r.score_overall));
    const speakerOverallAvgScores = responseSubmissions
      .map((s) => s.aggregate.overall)
      .filter((v): v is number => v !== null);
    const speakerMean = speakerOverallAvgScores.length > 0
      ? speakerOverallAvgScores.reduce((a, b) => a + b, 0) / speakerOverallAvgScores.length
      : null;

    const response: SpeakerFeedbackResponse = {
      speakerId: id,
      submissions: responseSubmissions,
      overall: {
        total_submissions: responseSubmissions.length,
        total_reviews: reviews.length,
        avg_overall: overallAvgAcrossAllReviews,
        percentile: percentile(speakerMean, cohortScores),
        cohort_size: cohortScores.length,
        cohort_avg: cohortAvg,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error('Error building speaker feedback', error, { speakerId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
