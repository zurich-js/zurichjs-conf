/**
 * CFP Scoring Utilities
 * Pure functions for score computation, formatting, and shortlist classification
 */

/**
 * Shortlist status classification
 */
export type ShortlistStatus =
  | 'likely_shortlisted'
  | 'needs_more_reviews'
  | 'likely_reject'
  | 'borderline';

/**
 * Full scoring data for a submission
 */
export interface SubmissionScoring {
  reviewCount: number;
  avgScore: number | null;
  totalReviewers: number;
  coverageRatio: number;
  coveragePercent: number;
  lastReviewedAt: string | null;
  status: ShortlistStatus;
}

/**
 * Round a number to specified decimal places using half-up rounding
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format a score for display (max 2 decimals, or "-" if null)
 */
export function formatScore(value: number | null): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return roundTo(value, 2).toString();
}

/**
 * Format a percentage for display (whole number with % symbol)
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Input for classification function
 */
export interface ClassificationInput {
  avgScore: number | null;
  reviewCount: number;
  coverageRatio: number;
}

/**
 * Classify a submission based on review data
 *
 * Rules:
 * - Likely shortlisted: avgScore >= 3.0 AND reviewCount >= 2 AND (coverageRatio >= 0.5 OR reviewCount >= 4)
 * - Needs more reviews: reviewCount < 2 OR (reviewCount < 4 AND coverageRatio < 0.5)
 * - Likely reject: avgScore < 2.0 AND reviewCount >= 2
 * - Borderline: everything else
 */
export function classifySubmission(input: ClassificationInput): ShortlistStatus {
  const { avgScore, reviewCount, coverageRatio } = input;

  // Needs more reviews takes priority - not enough data to classify
  if (reviewCount < 2 || (reviewCount < 4 && coverageRatio < 0.5)) {
    return 'needs_more_reviews';
  }

  // If no score data, needs more reviews
  if (avgScore === null) {
    return 'needs_more_reviews';
  }

  // Likely shortlisted: high score with good coverage
  if (avgScore >= 3.0 && reviewCount >= 2 && (coverageRatio >= 0.5 || reviewCount >= 4)) {
    return 'likely_shortlisted';
  }

  // Likely reject: low score with enough reviews
  if (avgScore < 2.0 && reviewCount >= 2) {
    return 'likely_reject';
  }

  // Everything else is borderline
  return 'borderline';
}

/**
 * Review data needed for scoring computation
 */
export interface ReviewInput {
  score_overall: number | null;
  created_at: string;
}

/**
 * Compute full scoring data from reviews
 */
export function computeSubmissionScoring(
  reviews: ReviewInput[],
  totalReviewers: number
): SubmissionScoring {
  const reviewCount = reviews.length;

  // Calculate average score from non-null scores
  const scores = reviews
    .map((r) => r.score_overall)
    .filter((s): s is number => s !== null);
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  // Calculate coverage
  const coverageRatio = totalReviewers > 0 ? reviewCount / totalReviewers : 0;
  const coveragePercent = coverageRatio * 100;

  // Find last reviewed timestamp
  const lastReviewedAt = reviews.length > 0
    ? reviews.reduce((latest, r) => {
        const reviewDate = new Date(r.created_at).getTime();
        const latestDate = latest ? new Date(latest).getTime() : 0;
        return reviewDate > latestDate ? r.created_at : latest;
      }, null as string | null)
    : null;

  // Classify
  const status = classifySubmission({ avgScore, reviewCount, coverageRatio });

  return {
    reviewCount,
    avgScore,
    totalReviewers,
    coverageRatio,
    coveragePercent,
    lastReviewedAt,
    status,
  };
}

/**
 * Labels for shortlist status display
 */
export const SHORTLIST_STATUS_LABELS: Record<ShortlistStatus, string> = {
  likely_shortlisted: 'Likely Shortlisted',
  needs_more_reviews: 'Needs More Reviews',
  likely_reject: 'Likely Reject',
  borderline: 'Borderline',
};

/**
 * Score bucket definitions for insights
 */
export const SCORE_BUCKETS = [
  { key: '0-1.99', label: '0 - 1.99', min: 0, max: 1.99 },
  { key: '2-2.99', label: '2 - 2.99', min: 2, max: 2.99 },
  { key: '3-3.49', label: '3 - 3.49', min: 3, max: 3.49 },
  { key: '3.5-4', label: '3.5 - 4', min: 3.5, max: 4 },
] as const;

/**
 * Coverage bucket definitions for insights
 */
export const COVERAGE_BUCKETS = [
  { key: '0-24', label: '0 - 24%', min: 0, max: 24 },
  { key: '25-49', label: '25 - 49%', min: 25, max: 49 },
  { key: '50-74', label: '50 - 74%', min: 50, max: 74 },
  { key: '75-100', label: '75 - 100%', min: 75, max: 100 },
] as const;

/**
 * Get the bucket key for a score value
 */
export function getScoreBucket(score: number | null): string | null {
  if (score === null) return null;
  for (const bucket of SCORE_BUCKETS) {
    if (score >= bucket.min && score <= bucket.max) {
      return bucket.key;
    }
  }
  return null;
}

/**
 * Get the bucket key for a coverage percentage
 */
export function getCoverageBucket(coveragePercent: number): string {
  for (const bucket of COVERAGE_BUCKETS) {
    if (coveragePercent >= bucket.min && coveragePercent <= bucket.max) {
      return bucket.key;
    }
  }
  // Default to highest bucket if over 100%
  return '75-100';
}
