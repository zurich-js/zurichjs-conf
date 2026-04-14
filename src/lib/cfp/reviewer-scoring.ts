/**
 * CFP Reviewer Scoring Utilities
 * Pure functions for reviewer contribution and activity scoring.
 */

import { roundTo } from './scoring';

export interface ReviewerContributionReviewInput {
  score_overall: number | null;
  score_relevance: number | null;
  score_technical_depth: number | null;
  score_clarity: number | null;
  score_diversity: number | null;
  private_notes: string | null;
  feedback_to_speaker: string | null;
}

export interface ReviewerContributionScoringWeights {
  reviewVolume: number;
  feedback: number;
  overallScoreRange: number;
  categoryScoreRange: number;
}

export const REVIEWER_CONTRIBUTION_SCORING_WEIGHTS: ReviewerContributionScoringWeights = {
  reviewVolume: 45,
  feedback: 35,
  overallScoreRange: 15,
  categoryScoreRange: 5,
};

const MAX_SCORE_SPREAD = 3;

export interface ReviewerContributionMetrics {
  feedbackWrittenCount: number;
  feedbackWrittenPercent: number;
  ratingSpread: number | null;
  categoryRatingSpread: number | null;
  contributionScore: number;
  volumeScore: number;
  feedbackScore: number;
  ratingSpreadScore: number;
  categoryRatingSpreadScore: number;
}

export function formatRatingSpreadLabel(ratingSpread: number | null): string {
  if (ratingSpread === null) return 'No scores';
  if (ratingSpread === 0) return 'Flat';
  if (ratingSpread <= 1) return 'Narrow';
  if (ratingSpread <= 2) return 'Varied';
  return 'Wide';
}

function hasWrittenFeedback(review: ReviewerContributionReviewInput): boolean {
  return Boolean(review.private_notes?.trim() || review.feedback_to_speaker?.trim());
}

function computeRatingSpreadRatio(ratingSpread: number | null): number {
  if (ratingSpread === null) return 0;

  // Scores are 1-4 in the reviewer UI, so a wider spread means the reviewer
  // is using more of the available scoring scale.
  return Math.max(0, Math.min(1, ratingSpread / MAX_SCORE_SPREAD));
}

function computeCategoryRatingSpread(review: ReviewerContributionReviewInput): number | null {
  const categoryScores = [
    review.score_relevance,
    review.score_technical_depth,
    review.score_clarity,
    review.score_diversity,
  ].filter((score): score is number => score !== null);

  if (categoryScores.length <= 1) return null;

  return Math.max(...categoryScores) - Math.min(...categoryScores);
}

function computeCategoryRatingSpreadRatio(reviews: ReviewerContributionReviewInput[]): {
  categoryRatingSpread: number | null;
  ratio: number;
} {
  const scoredReviews = reviews
    .map((review) => computeCategoryRatingSpread(review))
    .filter((categorySpread): categorySpread is number => categorySpread !== null);

  if (scoredReviews.length === 0) {
    return { categoryRatingSpread: null, ratio: 0 };
  }

  const avgCategoryRatingSpread = scoredReviews.reduce((sum, categorySpread) => sum + categorySpread, 0) / scoredReviews.length;

  return {
    categoryRatingSpread: roundTo(avgCategoryRatingSpread, 1),
    ratio: Math.max(0, Math.min(1, avgCategoryRatingSpread / MAX_SCORE_SPREAD)),
  };
}

/**
 * Compute reviewer contribution metrics for admin discount/contribution decisions.
 */
export function computeReviewerContributionMetrics(
  reviews: ReviewerContributionReviewInput[],
  maxReviewCount: number,
  weights: ReviewerContributionScoringWeights = REVIEWER_CONTRIBUTION_SCORING_WEIGHTS
): ReviewerContributionMetrics {
  const reviewCount = reviews.length;
  const feedbackWrittenCount = reviews.filter(hasWrittenFeedback).length;
  const feedbackWrittenPercent = reviewCount > 0 ? (feedbackWrittenCount / reviewCount) * 100 : 0;
  const volumeScore = maxReviewCount > 0 ? (reviewCount / maxReviewCount) * weights.reviewVolume : 0;
  const feedbackScore = (feedbackWrittenPercent / 100) * weights.feedback;

  const scores = reviews
    .map((r) => r.score_overall)
    .filter((score): score is number => score !== null);
  const ratingSpread = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : scores.length === 1 ? 0 : null;
  const ratingSpreadScore = computeRatingSpreadRatio(ratingSpread) * weights.overallScoreRange;
  const categorySpread = computeCategoryRatingSpreadRatio(reviews);
  const categoryRatingSpreadScore = categorySpread.ratio * weights.categoryScoreRange;
  const contributionScore = volumeScore + feedbackScore + ratingSpreadScore + categoryRatingSpreadScore;

  return {
    feedbackWrittenCount,
    feedbackWrittenPercent: roundTo(feedbackWrittenPercent, 1),
    ratingSpread,
    categoryRatingSpread: categorySpread.categoryRatingSpread,
    contributionScore: roundTo(contributionScore, 1),
    volumeScore: roundTo(volumeScore, 1),
    feedbackScore: roundTo(feedbackScore, 1),
    ratingSpreadScore: roundTo(ratingSpreadScore, 1),
    categoryRatingSpreadScore: roundTo(categoryRatingSpreadScore, 1),
  };
}
