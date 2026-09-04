/**
 * Unit Tests for Pricing Stage Configuration
 *
 * Covers stage windows (contiguity, boundaries), stage selection by date,
 * stock-based stage advancement, and next-stage resolution.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  GLOBAL_STOCK_LIMITS,
  PRICING_STAGES,
  emptyStockCounts,
  getCurrentStage,
  getEffectiveStageForCategory,
  getFinalStage,
  getNextStage,
  getStageConfig,
  getStagesAfter,
  getStockInfo,
  getTotalTicketsSold,
  isStageStockExhausted,
  type GlobalStockLimits,
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

  it('getFinalStage returns the last stage of the ladder', () => {
    expect(getFinalStage().stage).toBe('last_minute');
    expect(getFinalStage().priority).toBe(PRICING_STAGES.length);
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

describe('getStagesAfter', () => {
  it('returns every later stage in ladder order', () => {
    expect(getStagesAfter('standard').map((s) => s.stage)).toEqual(['late_bird', 'last_minute']);
    expect(getStagesAfter('blind_bird').map((s) => s.stage)).toEqual([
      'early_bird',
      'standard',
      'late_bird',
      'last_minute',
    ]);
  });

  it('excludes the stage itself', () => {
    expect(getStagesAfter('late_bird').map((s) => s.stage)).toEqual(['last_minute']);
  });

  it('returns an empty list for the final stage', () => {
    expect(getStagesAfter('last_minute')).toEqual([]);
  });
});

describe('getEffectiveStageForCategory', () => {
  it('caps VIP at late_bird during last_minute', () => {
    expect(getEffectiveStageForCategory('vip', 'last_minute')).toBe('late_bird');
  });

  it('leaves VIP unchanged up to and including late_bird', () => {
    expect(getEffectiveStageForCategory('vip', 'blind_bird')).toBe('blind_bird');
    expect(getEffectiveStageForCategory('vip', 'early_bird')).toBe('early_bird');
    expect(getEffectiveStageForCategory('vip', 'standard')).toBe('standard');
    expect(getEffectiveStageForCategory('vip', 'late_bird')).toBe('late_bird');
  });

  it('leaves uncapped categories on the current stage', () => {
    expect(getEffectiveStageForCategory('standard', 'last_minute')).toBe('last_minute');
    expect(getEffectiveStageForCategory('standard_student_unemployed', 'last_minute')).toBe(
      'last_minute'
    );
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

describe('emptyStockCounts', () => {
  it('zeroes every stage and category', () => {
    const counts = emptyStockCounts();
    expect(Object.values(counts.byStage).every((n) => n === 0)).toBe(true);
    expect(Object.values(counts.byCategory).every((n) => n === 0)).toBe(true);
  });

  it('returns a fresh object each call (no shared mutable state)', () => {
    const first = emptyStockCounts();
    first.byCategory.vip = 5;
    expect(emptyStockCounts().byCategory.vip).toBe(0);
  });
});

describe('getTotalTicketsSold', () => {
  it('sums every category', () => {
    const counts = emptyStockCounts();
    counts.byCategory.vip = 10;
    counts.byCategory.standard_student_unemployed = 7;
    counts.byCategory.standard = 100;
    expect(getTotalTicketsSold(counts)).toBe(117);
  });

  it('treats missing category counts as zero', () => {
    const counts = { byStage: {}, byCategory: {} } as unknown as StageStockCounts;
    expect(getTotalTicketsSold(counts)).toBe(0);
  });
});

describe('getStockInfo', () => {
  const limits: GlobalStockLimits = {
    vip: 52,
    student_unemployed: 35,
    standard_total: 300,
  };

  const countsWith = (byCategory: Partial<StageStockCounts['byCategory']>, stage?: Partial<StageStockCounts['byStage']>): StageStockCounts => {
    const counts = emptyStockCounts();
    Object.assign(counts.byCategory, byCategory);
    if (stage) Object.assign(counts.byStage, stage);
    return counts;
  };

  describe('VIP', () => {
    it('measures the VIP limit against VIP sales only', () => {
      const counts = countsWith({ vip: 12, standard: 200, standard_student_unemployed: 30 });
      expect(getStockInfo('vip', 'early_bird', counts, limits)).toEqual({
        remaining: 40,
        total: 52,
        soldOut: false,
      });
    });

    it('is sold out once the limit is reached', () => {
      const counts = countsWith({ vip: 52 });
      expect(getStockInfo('vip', 'early_bird', counts, limits)).toEqual({
        remaining: 0,
        total: 52,
        soldOut: true,
      });
    });

    it('never reports negative remaining when oversold', () => {
      const counts = countsWith({ vip: 60 });
      const stock = getStockInfo('vip', 'early_bird', counts, limits);
      expect(stock.remaining).toBe(0);
      expect(stock.soldOut).toBe(true);
    });
  });

  describe('student / unemployed', () => {
    it('measures its own limit against its own sales', () => {
      const counts = countsWith({ standard_student_unemployed: 30, standard: 200 });
      expect(getStockInfo('standard_student_unemployed', 'early_bird', counts, limits)).toEqual({
        remaining: 5,
        total: 35,
        soldOut: false,
      });
    });
  });

  describe('standard (total-attendee cap)', () => {
    it('subtracts every confirmed ticket, not just standard sales', () => {
      // 100 standard + 12 VIP + 30 student = 142 of the 300-seat venue used
      const counts = countsWith({ standard: 100, vip: 12, standard_student_unemployed: 30 });
      expect(getStockInfo('standard', 'early_bird', counts, limits)).toEqual({
        remaining: 158,
        total: 300,
        soldOut: false,
      });
    });

    it('sells out when the other categories fill the venue', () => {
      // Standard itself has sold nothing, but VIP + student fill all 300 seats
      const counts = countsWith({ standard: 0, vip: 52, standard_student_unemployed: 248 });
      expect(getStockInfo('standard', 'early_bird', counts, limits)).toEqual({
        remaining: 0,
        total: 300,
        soldOut: true,
      });
    });

    it('is uncapped when standard_total is null', () => {
      const counts = countsWith({ standard: 1000, vip: 52 });
      expect(
        getStockInfo('standard', 'early_bird', counts, { ...limits, standard_total: null })
      ).toEqual({
        remaining: null,
        total: null,
        soldOut: false,
      });
    });

    it('takes the tighter of the total cap and the stage batch limit', () => {
      // Blind bird caps its own batch at 30. 25 sold in that batch leaves 5,
      // while the 300-seat venue still has plenty — the batch is what gates.
      const counts = countsWith(
        { standard: 25, vip: 0, standard_student_unemployed: 0 },
        { blind_bird: 25 }
      );
      expect(getStockInfo('standard', 'blind_bird', counts, limits)).toEqual({
        remaining: 5,
        total: 30,
        soldOut: false,
      });
    });

    it('lets the total cap win when it is tighter than the stage batch', () => {
      // 298 of 300 seats gone leaves 2, tighter than the blind-bird batch's 25
      const counts = countsWith(
        { standard: 5, vip: 52, standard_student_unemployed: 241 },
        { blind_bird: 5 }
      );
      expect(getStockInfo('standard', 'blind_bird', counts, limits)).toEqual({
        remaining: 2,
        total: 300,
        soldOut: false,
      });
    });
  });

  it('defaults to the hardcoded fallback limits when none are passed', () => {
    const counts = countsWith({ vip: 2 });
    expect(getStockInfo('vip', 'early_bird', counts)).toEqual({
      remaining: GLOBAL_STOCK_LIMITS.vip - 2,
      total: GLOBAL_STOCK_LIMITS.vip,
      soldOut: false,
    });
  });

  it('reports every limit as fully available when nothing is sold', () => {
    const counts = emptyStockCounts();
    expect(getStockInfo('vip', 'early_bird', counts, limits).remaining).toBe(52);
    expect(getStockInfo('standard_student_unemployed', 'early_bird', counts, limits).remaining).toBe(35);
    expect(getStockInfo('standard', 'early_bird', counts, limits).remaining).toBe(300);
  });
});
