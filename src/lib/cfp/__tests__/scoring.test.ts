/**
 * Unit Tests for CFP Scoring Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  roundTo,
  formatScore,
  formatPercent,
  classifySubmission,
  computeSubmissionScoring,
  getScoreBucket,
  getCoverageBucket,
} from '../scoring';

describe('roundTo', () => {
  it('rounds to 2 decimal places by default', () => {
    expect(roundTo(2.345)).toBe(2.35);
    expect(roundTo(2.344)).toBe(2.34);
    expect(roundTo(3.333333)).toBe(3.33);
  });

  it('rounds to specified decimal places', () => {
    expect(roundTo(2.3456, 3)).toBe(2.346);
    expect(roundTo(2.3456, 1)).toBe(2.3);
    expect(roundTo(2.5, 0)).toBe(3);
  });

  it('handles half-up rounding correctly', () => {
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(2.45, 1)).toBe(2.5);
    expect(roundTo(2.555, 2)).toBe(2.56);
  });

  it('handles whole numbers', () => {
    expect(roundTo(3)).toBe(3);
    expect(roundTo(3.0)).toBe(3);
  });
});

describe('formatScore', () => {
  it('formats scores with max 2 decimals', () => {
    expect(formatScore(3.5)).toBe('3.5');
    expect(formatScore(3.25)).toBe('3.25');
    expect(formatScore(3.333333)).toBe('3.33');
  });

  it('returns "-" for null values', () => {
    expect(formatScore(null)).toBe('-');
  });

  it('handles whole numbers', () => {
    expect(formatScore(3)).toBe('3');
    expect(formatScore(4)).toBe('4');
  });

  it('handles zero', () => {
    expect(formatScore(0)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('formats percentages as whole numbers', () => {
    expect(formatPercent(75)).toBe('75%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('rounds percentages to nearest whole number', () => {
    expect(formatPercent(75.5)).toBe('76%');
    expect(formatPercent(75.4)).toBe('75%');
    expect(formatPercent(33.33)).toBe('33%');
  });
});

describe('classifySubmission', () => {
  describe('likely_shortlisted', () => {
    it('classifies high score with good coverage as likely shortlisted', () => {
      expect(classifySubmission({
        avgScore: 3.5,
        reviewCount: 4,
        coverageRatio: 0.6,
      })).toBe('likely_shortlisted');
    });

    it('classifies score of exactly 3.0 with coverage >= 0.5 as likely shortlisted', () => {
      expect(classifySubmission({
        avgScore: 3.0,
        reviewCount: 2,
        coverageRatio: 0.5,
      })).toBe('likely_shortlisted');
    });

    it('classifies high score with 4+ reviews as likely shortlisted (regardless of coverage)', () => {
      expect(classifySubmission({
        avgScore: 3.2,
        reviewCount: 4,
        coverageRatio: 0.4, // below 0.5 but has 4 reviews
      })).toBe('likely_shortlisted');
    });
  });

  describe('needs_more_reviews', () => {
    it('classifies submissions with less than 2 reviews as needs more reviews', () => {
      expect(classifySubmission({
        avgScore: 3.5,
        reviewCount: 1,
        coverageRatio: 0.1,
      })).toBe('needs_more_reviews');

      expect(classifySubmission({
        avgScore: 1.0,
        reviewCount: 0,
        coverageRatio: 0,
      })).toBe('needs_more_reviews');
    });

    it('classifies low coverage with less than 4 reviews as needs more reviews', () => {
      expect(classifySubmission({
        avgScore: 3.5,
        reviewCount: 3,
        coverageRatio: 0.4, // below 0.5 and less than 4 reviews
      })).toBe('needs_more_reviews');
    });

    it('classifies null score as needs more reviews', () => {
      expect(classifySubmission({
        avgScore: null,
        reviewCount: 3,
        coverageRatio: 0.6,
      })).toBe('needs_more_reviews');
    });
  });

  describe('likely_reject', () => {
    it('classifies low score with enough reviews as likely reject', () => {
      expect(classifySubmission({
        avgScore: 1.5,
        reviewCount: 4,
        coverageRatio: 0.6,
      })).toBe('likely_reject');
    });

    it('classifies score just below 2.0 as likely reject', () => {
      expect(classifySubmission({
        avgScore: 1.99,
        reviewCount: 5,
        coverageRatio: 0.7,
      })).toBe('likely_reject');
    });
  });

  describe('borderline', () => {
    it('classifies mid-range scores as borderline', () => {
      expect(classifySubmission({
        avgScore: 2.5,
        reviewCount: 4,
        coverageRatio: 0.6,
      })).toBe('borderline');
    });

    it('classifies score of exactly 2.0 with enough reviews as borderline', () => {
      expect(classifySubmission({
        avgScore: 2.0,
        reviewCount: 4,
        coverageRatio: 0.6,
      })).toBe('borderline');
    });

    it('classifies score just below 3.0 as borderline', () => {
      expect(classifySubmission({
        avgScore: 2.99,
        reviewCount: 4,
        coverageRatio: 0.6,
      })).toBe('borderline');
    });
  });

  describe('edge cases', () => {
    it('prioritizes needs_more_reviews over other statuses', () => {
      // Even with a high score, low reviews = needs more
      expect(classifySubmission({
        avgScore: 4.0,
        reviewCount: 1,
        coverageRatio: 0.1,
      })).toBe('needs_more_reviews');
    });

    it('handles exactly 2 reviews with exactly 50% coverage', () => {
      expect(classifySubmission({
        avgScore: 3.0,
        reviewCount: 2,
        coverageRatio: 0.5,
      })).toBe('likely_shortlisted');
    });
  });
});

describe('computeSubmissionScoring', () => {
  it('computes correct averages', () => {
    const reviews = [
      { score_overall: 3, created_at: '2024-01-01T10:00:00Z' },
      { score_overall: 4, created_at: '2024-01-02T10:00:00Z' },
      { score_overall: 3, created_at: '2024-01-03T10:00:00Z' },
    ];
    const result = computeSubmissionScoring(reviews, 5);

    expect(result.reviewCount).toBe(3);
    expect(result.avgScore).toBeCloseTo(3.333, 2);
    expect(result.totalReviewers).toBe(5);
    expect(result.coverageRatio).toBeCloseTo(0.6, 2);
    expect(result.coveragePercent).toBeCloseTo(60, 0);
  });

  it('finds the latest review timestamp', () => {
    const reviews = [
      { score_overall: 3, created_at: '2024-01-01T10:00:00Z' },
      { score_overall: 4, created_at: '2024-01-15T10:00:00Z' },
      { score_overall: 3, created_at: '2024-01-10T10:00:00Z' },
    ];
    const result = computeSubmissionScoring(reviews, 5);

    expect(result.lastReviewedAt).toBe('2024-01-15T10:00:00Z');
  });

  it('handles empty reviews', () => {
    const result = computeSubmissionScoring([], 5);

    expect(result.reviewCount).toBe(0);
    expect(result.avgScore).toBe(null);
    expect(result.coverageRatio).toBe(0);
    expect(result.coveragePercent).toBe(0);
    expect(result.lastReviewedAt).toBe(null);
    expect(result.status).toBe('needs_more_reviews');
  });

  it('handles null scores in reviews', () => {
    const reviews = [
      { score_overall: 3, created_at: '2024-01-01T10:00:00Z' },
      { score_overall: null, created_at: '2024-01-02T10:00:00Z' },
      { score_overall: 4, created_at: '2024-01-03T10:00:00Z' },
    ];
    const result = computeSubmissionScoring(reviews, 5);

    expect(result.reviewCount).toBe(3);
    expect(result.avgScore).toBeCloseTo(3.5, 2); // Average of 3 and 4
  });

  it('handles zero total reviewers', () => {
    const reviews = [
      { score_overall: 3, created_at: '2024-01-01T10:00:00Z' },
    ];
    const result = computeSubmissionScoring(reviews, 0);

    expect(result.coverageRatio).toBe(0);
    expect(result.coveragePercent).toBe(0);
  });

  it('correctly classifies based on computed values', () => {
    // High score, good coverage -> likely_shortlisted
    const highScore = computeSubmissionScoring([
      { score_overall: 3.5, created_at: '2024-01-01T10:00:00Z' },
      { score_overall: 3.5, created_at: '2024-01-02T10:00:00Z' },
      { score_overall: 3.5, created_at: '2024-01-03T10:00:00Z' },
      { score_overall: 3.5, created_at: '2024-01-04T10:00:00Z' },
    ], 6);
    expect(highScore.status).toBe('likely_shortlisted');

    // Low score -> likely_reject
    const lowScore = computeSubmissionScoring([
      { score_overall: 1.5, created_at: '2024-01-01T10:00:00Z' },
      { score_overall: 1.5, created_at: '2024-01-02T10:00:00Z' },
      { score_overall: 1.5, created_at: '2024-01-03T10:00:00Z' },
      { score_overall: 1.5, created_at: '2024-01-04T10:00:00Z' },
    ], 6);
    expect(lowScore.status).toBe('likely_reject');
  });
});

describe('getScoreBucket', () => {
  it('returns correct bucket for scores', () => {
    expect(getScoreBucket(0)).toBe('0-1.99');
    expect(getScoreBucket(1.5)).toBe('0-1.99');
    expect(getScoreBucket(1.99)).toBe('0-1.99');
    expect(getScoreBucket(2.0)).toBe('2-2.99');
    expect(getScoreBucket(2.5)).toBe('2-2.99');
    expect(getScoreBucket(3.0)).toBe('3-3.49');
    expect(getScoreBucket(3.49)).toBe('3-3.49');
    expect(getScoreBucket(3.5)).toBe('3.5-4');
    expect(getScoreBucket(4.0)).toBe('3.5-4');
  });

  it('returns null for null scores', () => {
    expect(getScoreBucket(null)).toBe(null);
  });
});

describe('getCoverageBucket', () => {
  it('returns correct bucket for coverage percentages', () => {
    expect(getCoverageBucket(0)).toBe('0-24');
    expect(getCoverageBucket(24)).toBe('0-24');
    expect(getCoverageBucket(25)).toBe('25-49');
    expect(getCoverageBucket(49)).toBe('25-49');
    expect(getCoverageBucket(50)).toBe('50-74');
    expect(getCoverageBucket(74)).toBe('50-74');
    expect(getCoverageBucket(75)).toBe('75-100');
    expect(getCoverageBucket(100)).toBe('75-100');
  });

  it('handles values over 100%', () => {
    expect(getCoverageBucket(150)).toBe('75-100');
  });
});
