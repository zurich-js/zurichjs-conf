import { describe, it, expect } from 'vitest';
import {
  SUBMISSION_LIMITS,
  isActiveSubmissionStatus,
  getActiveSubmissions,
  countActiveSubmissions,
  canCreateSubmission,
} from '../config';

describe('isActiveSubmissionStatus', () => {
  it('returns true for active statuses', () => {
    const activeStatuses = ['draft', 'submitted', 'under_review', 'shortlisted', 'waitlisted', 'accepted'];
    for (const status of activeStatuses) {
      expect(isActiveSubmissionStatus(status)).toBe(true);
    }
  });

  it('returns false for withdrawn', () => {
    expect(isActiveSubmissionStatus('withdrawn')).toBe(false);
  });

  it('returns false for rejected', () => {
    expect(isActiveSubmissionStatus('rejected')).toBe(false);
  });
});

describe('getActiveSubmissions', () => {
  it('filters out withdrawn and rejected submissions', () => {
    const submissions = [
      { status: 'draft' },
      { status: 'submitted' },
      { status: 'withdrawn' },
      { status: 'rejected' },
      { status: 'accepted' },
    ];
    const result = getActiveSubmissions(submissions);
    expect(result).toEqual([
      { status: 'draft' },
      { status: 'submitted' },
      { status: 'accepted' },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(getActiveSubmissions([])).toEqual([]);
  });

  it('returns all submissions when none are excluded', () => {
    const submissions = [{ status: 'draft' }, { status: 'submitted' }];
    expect(getActiveSubmissions(submissions)).toEqual(submissions);
  });
});

describe('countActiveSubmissions', () => {
  it('counts only active submissions', () => {
    const submissions = [
      { status: 'draft' },
      { status: 'submitted' },
      { status: 'withdrawn' },
      { status: 'rejected' },
    ];
    expect(countActiveSubmissions(submissions)).toBe(2);
  });

  it('returns 0 for empty array', () => {
    expect(countActiveSubmissions([])).toBe(0);
  });
});

describe('canCreateSubmission', () => {
  it('returns true when under the limit', () => {
    const submissions = Array.from({ length: 4 }, () => ({ status: 'submitted' }));
    expect(canCreateSubmission(submissions)).toBe(true);
  });

  it('returns false when at the limit', () => {
    const submissions = Array.from(
      { length: SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS },
      () => ({ status: 'submitted' }),
    );
    expect(canCreateSubmission(submissions)).toBe(false);
  });

  it('returns false when over the limit', () => {
    const submissions = Array.from(
      { length: SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS + 1 },
      () => ({ status: 'submitted' }),
    );
    expect(canCreateSubmission(submissions)).toBe(false);
  });

  it('does not count withdrawn and rejected toward the limit', () => {
    const submissions = [
      ...Array.from({ length: 4 }, () => ({ status: 'submitted' })),
      { status: 'withdrawn' },
      { status: 'rejected' },
    ];
    // 4 active + 2 excluded = 6 total, but only 4 count
    expect(canCreateSubmission(submissions)).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(canCreateSubmission([])).toBe(true);
  });
});
