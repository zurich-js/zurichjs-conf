/**
 * Unit Tests for Pricing Stage Configuration
 *
 * Covers stage windows (contiguity, boundaries), stage selection by date,
 * stock-based stage advancement, and next-stage resolution.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  PRICING_STAGES,
  getCurrentStage,
  getNextStage,
  getStageConfig,
  isStageStockExhausted,
  type StageStockCounts,
} from '../pricing-stages';

const emptyCounts = (): StageStockCounts => ({
  byStage: {
    blind_bird: 0,
    early_bird: 0,
    standard: 0,
    late_bird: 0,
    last_minute: 0,
  },
  byCategory: {
    standard_student_unemployed: 0,
    standard: 0,
    vip: 0,
  },
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PRICING_STAGES', () => {
  it('has contiguous stage windows (each stage starts when the previous ends)', () => {
    for (let i = 1; i < PRICING_STAGES.length; i++) {
      expect(PRICING_STAGES[i].startDate.getTime()).toBe(
        PRICING_STAGES[i - 1].endDate.getTime()
      );
    }
  });

  it('has strictly increasing priorities starting at 1', () => {
    PRICING_STAGES.forEach((stage, i) => {
      expect(stage.priority).toBe(i + 1);
    });
  });

  it('ends with last_minute as the final stage', () => {
    expect(PRICING_STAGES[PRICING_STAGES.length - 1].stage).toBe('last_minute');
  });
});

describe('getCurrentStage', () => {
  it('returns late_bird just before the last_minute boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-27T23:59:59.000Z'));

    expect(getCurrentStage().stage).toBe('late_bird');
  });

  it('returns last_minute from Aug 28 (two weeks before the conference)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T00:00:00.000Z'));

    expect(getCurrentStage().stage).toBe('last_minute');
  });

  it('returns last_minute right up to the conference', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T12:00:00.000Z'));

    expect(getCurrentStage().stage).toBe('last_minute');
  });

  it('advances past blind_bird when its stock limit is exhausted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-01T00:00:00.000Z'));

    const counts = emptyCounts();
    counts.byStage.blind_bird = 30;

    expect(getCurrentStage(counts).stage).toBe('early_bird');
  });
});

describe('getNextStage', () => {
  it('resolves the full stage ladder in order', () => {
    expect(getNextStage('blind_bird')?.stage).toBe('early_bird');
    expect(getNextStage('early_bird')?.stage).toBe('standard');
    expect(getNextStage('standard')?.stage).toBe('late_bird');
    expect(getNextStage('late_bird')?.stage).toBe('last_minute');
  });

  it('returns undefined after the final stage', () => {
    expect(getNextStage('last_minute')).toBeUndefined();
  });
});

describe('isStageStockExhausted', () => {
  it('is false for stages without a stage limit', () => {
    const counts = emptyCounts();
    counts.byStage.last_minute = 10000;

    expect(isStageStockExhausted('last_minute', counts)).toBe(false);
  });

  it('is true for blind_bird once its limit is reached', () => {
    const counts = emptyCounts();
    counts.byStage.blind_bird = getStageConfig('blind_bird')!.stockLimits!.stageLimit!;

    expect(isStageStockExhausted('blind_bird', counts)).toBe(true);
  });
});
