import { describe, expect, it } from 'vitest';

import {
  computeReviewerContributionMetrics,
  type ReviewerContributionReviewInput,
} from '../reviewer-scoring';

function makeReview(
  scoreOverall: number,
  categoryScores: Partial<Pick<
    ReviewerContributionReviewInput,
    'score_relevance' | 'score_technical_depth' | 'score_clarity' | 'score_diversity'
  >> = {}
): ReviewerContributionReviewInput {
  return {
    score_overall: scoreOverall,
    score_relevance: categoryScores.score_relevance ?? scoreOverall,
    score_technical_depth: categoryScores.score_technical_depth ?? scoreOverall,
    score_clarity: categoryScores.score_clarity ?? scoreOverall,
    score_diversity: categoryScores.score_diversity ?? scoreOverall,
    private_notes: null,
    feedback_to_speaker: null,
  };
}

describe('computeReviewerContributionMetrics', () => {
  it('rewards wider overall score ranges more than narrow ranges', () => {
    const narrow = computeReviewerContributionMetrics([
      makeReview(2),
      makeReview(2),
      makeReview(3),
    ], 3);
    const wide = computeReviewerContributionMetrics([
      makeReview(1),
      makeReview(2),
      makeReview(4),
    ], 3);

    expect(narrow.ratingSpread).toBe(1);
    expect(narrow.ratingSpreadScore).toBe(5);
    expect(wide.ratingSpread).toBe(3);
    expect(wide.ratingSpreadScore).toBe(15);
    expect(wide.ratingSpreadScore).toBeGreaterThan(narrow.ratingSpreadScore);
  });

  it('gives no range contribution for flat overall scores', () => {
    const flat = computeReviewerContributionMetrics([
      makeReview(2),
      makeReview(2),
      makeReview(2),
    ], 3);

    expect(flat.ratingSpread).toBe(0);
    expect(flat.ratingSpreadScore).toBe(0);
  });

  it('rewards wider category score ranges more than narrow category ranges', () => {
    const narrow = computeReviewerContributionMetrics([
      makeReview(3, {
        score_relevance: 2,
        score_technical_depth: 2,
        score_clarity: 3,
        score_diversity: 3,
      }),
    ], 1);
    const wide = computeReviewerContributionMetrics([
      makeReview(3, {
        score_relevance: 1,
        score_technical_depth: 2,
        score_clarity: 3,
        score_diversity: 4,
      }),
    ], 1);

    expect(narrow.categoryRatingSpread).toBe(1);
    expect(narrow.categoryRatingSpreadScore).toBe(1.7);
    expect(wide.categoryRatingSpread).toBe(3);
    expect(wide.categoryRatingSpreadScore).toBe(5);
    expect(wide.categoryRatingSpreadScore).toBeGreaterThan(narrow.categoryRatingSpreadScore);
  });
});
