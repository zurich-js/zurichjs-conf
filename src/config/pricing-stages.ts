/**
 * Centralized Pricing Stage Configuration
 *
 * This file defines when each pricing phase starts/ends for the conference.
 * Used by both the pricing API and UI components to ensure consistency.
 *
 * Stage transitions occur based on:
 * 1. Date thresholds (e.g., early bird ends May 15, 2026)
 * 2. Stock limits (e.g., blind bird ends when 30 tickets sold)
 */

/**
 * Price stage types
 */
export type PriceStage = 'blind_bird' | 'early_bird' | 'standard' | 'late_bird' | 'last_minute';

/**
 * Ticket category types
 */
export type TicketCategory = 'standard_student_unemployed' | 'standard' | 'vip';

/**
 * Stock limits configuration
 */
export interface StockLimits {
  /** Total tickets available in this stage (null = unlimited) */
  stageLimit?: number;
  /** Categories this limit applies to */
  limitedCategories?: TicketCategory[];
}

/**
 * Global stock limits (independent of stage)
 *
 * These are the fallback defaults. The live values are admin-editable and
 * stored in the `ticket_stock_config` singleton table — resolve them with
 * `getTicketStockLimits()` from `@/lib/tickets/stock-config` (server-only) and
 * pass them to `getStockInfo`.
 */
export interface GlobalStockLimits {
  /** VIP tickets are limited globally across all stages */
  vip: number;
  /** Student/Unemployed tickets are limited globally across all stages */
  student_unemployed: number;
  /**
   * Total-attendee cap that bounds standard tickets.
   *
   * Standard tickets are whatever is left of the venue once the other
   * categories are accounted for, so remaining standard stock is this cap
   * minus every confirmed ticket across VIP, student/unemployed AND standard —
   * not a standard-only allowance. `null` leaves standard uncapped.
   */
  standard_total: number | null;
}

/**
 * Stage configuration with date ranges and metadata
 */
export interface StageConfig {
  /** Stage identifier */
  stage: PriceStage;
  /** Display name for the stage */
  displayName: string;
  /** When this stage begins */
  startDate: Date;
  /** When this stage ends (exclusive) - stage can end earlier if stock runs out */
  endDate: Date;
  /** Priority for stage selection (lower = earlier/cheaper) */
  priority: number;
  /** Short description of this stage */
  description: string;
  /** Stock limits for this stage */
  stockLimits?: StockLimits;
}

/**
 * Global stock limits across all stages
 */
export const GLOBAL_STOCK_LIMITS: GlobalStockLimits = {
  vip: 52,
  student_unemployed: 35,
  // Uncapped by default: the cap only bites once an admin sets a number in
  // `ticket_stock_config`, so a DB read failure can never invent a sell-out.
  standard_total: null,
};

/**
 * Get stock remaining for a category/stage
 */
export interface StockInfo {
  /** Remaining tickets for this category */
  remaining: number | null;
  /** Total tickets available (null = unlimited) */
  total: number | null;
  /** Whether this ticket is sold out */
  soldOut: boolean;
}

/**
 * Pricing stage configurations
 *
 * Timeline dates (from timeline.ts):
 * - Blind bird: Nov 14, 2025 -> Jan 1, 2026 (OR 30 tickets sold)
 * - Early bird: Jan 1, 2026 -> Apr 22, 2026
 * - Standard (General Admission): Apr 22, 2026 -> Aug 1, 2026
 * - Late bird: Aug 1, 2026 -> Aug 28, 2026
 * - Last minute: Aug 28, 2026 -> Sep 11, 2026 (final two weeks)
 *
 * Stock limits:
 * - Blind bird: 30 tickets total (standard + VIP combined)
 * - VIP: 52 tickets global (across all stages)
 */
export const PRICING_STAGES: StageConfig[] = [
  {
    stage: 'blind_bird',
    displayName: 'Blind Bird',
    startDate: new Date('2025-11-14T00:00:00.000Z'),
    endDate: new Date('2026-01-01T00:00:00.000Z'),
    priority: 1,
    description: 'Lowest price - before keynote speakers announced',
    stockLimits: {
      stageLimit: 30,
      limitedCategories: ['standard', 'vip'],
    },
  },
  {
    stage: 'early_bird',
    displayName: 'Early Bird',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-04-22T00:00:00.000Z'),
    priority: 2,
    description: 'Save now - early bird pricing',
  },
  {
    stage: 'standard',
    displayName: 'General Admission',
    startDate: new Date('2026-04-22T00:00:00.000Z'),
    endDate: new Date('2026-08-01T00:00:00.000Z'),
    priority: 3,
    description: 'Regular pricing',
  },
  {
    stage: 'late_bird',
    displayName: 'Late Bird',
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-28T00:00:00.000Z'),
    priority: 4,
    description: 'Late pricing - prices rise again soon',
  },
  {
    stage: 'last_minute',
    displayName: 'Last Minute',
    startDate: new Date('2026-08-28T00:00:00.000Z'),
    endDate: new Date('2026-09-11T00:00:00.000Z'),
    priority: 5,
    description: 'Final pricing - last chance',
  },
];

/**
 * Per-category pricing stage caps.
 *
 * Some categories stop climbing the price ladder before the final stage:
 * VIP has no last_minute price in Stripe — it tops out at late bird — so
 * during last_minute it must keep selling at its late_bird price instead
 * of disappearing.
 */
export const CATEGORY_STAGE_CAPS: Partial<Record<TicketCategory, PriceStage>> = {
  vip: 'late_bird',
};

/**
 * Resolve the pricing stage that actually applies to a category.
 *
 * Returns the given stage unless the category is capped at an earlier one
 * (see CATEGORY_STAGE_CAPS), in which case the cap stage is returned once
 * the overall stage has moved past it.
 */
export const getEffectiveStageForCategory = (
  category: TicketCategory,
  stage: PriceStage
): PriceStage => {
  const cap = CATEGORY_STAGE_CAPS[category];
  if (!cap) return stage;

  const capConfig = getStageConfig(cap);
  const stageConfig = getStageConfig(stage);
  if (!capConfig || !stageConfig) return stage;

  return stageConfig.priority > capConfig.priority ? cap : stage;
};

/**
 * Stock counts for determining stage transitions
 */
export interface StageStockCounts {
  /** Tickets sold in each stage */
  byStage: Record<PriceStage, number>;
  /** Tickets sold by category (globally) */
  byCategory: Record<TicketCategory, number>;
}

/**
 * Check if a stage's stock limit has been reached
 */
export const isStageStockExhausted = (
  stage: PriceStage,
  stockCounts: StageStockCounts
): boolean => {
  const config = getStageConfig(stage);
  if (!config?.stockLimits?.stageLimit) return false;

  const soldInStage = stockCounts.byStage[stage] || 0;
  return soldInStage >= config.stockLimits.stageLimit;
};

/**
 * Get the current active pricing stage based on date and stock
 * @param stockCounts - Optional stock counts to determine if stage should advance due to sold out
 */
export const getCurrentStage = (stockCounts?: StageStockCounts): StageConfig => {
  const now = new Date();

  // Find all stages that are in their date window
  for (const config of PRICING_STAGES) {
    const inDateWindow = now >= config.startDate && now < config.endDate;

    if (inDateWindow) {
      // Check if this stage's stock is exhausted
      if (stockCounts && isStageStockExhausted(config.stage, stockCounts)) {
        // Move to next stage if stock is exhausted
        const nextStage = getNextStage(config.stage);
        if (nextStage) {
          return nextStage;
        }
      }
      return config;
    }
  }

  // Default to standard if no active stage found
  return PRICING_STAGES.find(s => s.stage === 'standard')!;
};

/**
 * Get stage configuration by stage name
 */
export const getStageConfig = (stage: PriceStage): StageConfig | undefined => {
  return PRICING_STAGES.find(s => s.stage === stage);
};

/**
 * Get the final pricing stage (highest priority) — the anchor for compare
 * prices and "prices rise until" copy
 */
export const getFinalStage = (): StageConfig => {
  return PRICING_STAGES[PRICING_STAGES.length - 1];
};

/**
 * Get every stage that comes after the given one, cheapest first.
 * Used to find the highest price a ticket will still reach — a category can
 * stop increasing before the final stage (VIP tops out at late bird), so the
 * final stage alone is not a reliable anchor.
 */
export const getStagesAfter = (currentStage: PriceStage): StageConfig[] => {
  const currentConfig = getStageConfig(currentStage);
  if (!currentConfig) return [];

  return PRICING_STAGES.filter(s => s.priority > currentConfig.priority);
};

/**
 * Get the next pricing stage after the current one
 */
export const getNextStage = (currentStage: PriceStage): StageConfig | undefined => {
  const currentConfig = getStageConfig(currentStage);
  if (!currentConfig) return undefined;

  return PRICING_STAGES.find(s => s.priority === currentConfig.priority + 1);
};

/**
 * Check if a specific stage is currently active
 */
export const isStageActive = (stage: PriceStage, stockCounts?: StageStockCounts): boolean => {
  const current = getCurrentStage(stockCounts);
  return current.stage === stage;
};

/**
 * Get the end date of the current stage (for countdown purposes)
 */
export const getCurrentStageEndDate = (stockCounts?: StageStockCounts): Date => {
  return getCurrentStage(stockCounts).endDate;
};

/**
 * An all-zero set of stock counts.
 *
 * Used as the stand-in when the sold-ticket query fails: every limit then
 * reports its full allowance as remaining rather than a spurious sell-out.
 */
export const emptyStockCounts = (): StageStockCounts => ({
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

/**
 * Total confirmed tickets across every category.
 *
 * This is the figure the total-attendee cap is measured against — a VIP or
 * student seat consumes venue capacity exactly like a standard one does.
 */
export const getTotalTicketsSold = (stockCounts: StageStockCounts): number =>
  (stockCounts.byCategory.vip || 0) +
  (stockCounts.byCategory.standard_student_unemployed || 0) +
  (stockCounts.byCategory.standard || 0);

/** Build a StockInfo from a limit and the number already sold against it. */
const stockFromLimit = (limit: number, sold: number): StockInfo => ({
  remaining: Math.max(0, limit - sold),
  total: limit,
  soldOut: sold >= limit,
});

/**
 * Calculate remaining stock for a category in the current stage.
 *
 * A category can be bounded by more than one limit at once — standard tickets
 * during blind bird are capped both by the 30-ticket blind-bird batch and by
 * the total-attendee cap. The tightest limit wins, since that is the one that
 * actually stops the sale.
 *
 * @param limits - Resolved stock limits. Defaults to the hardcoded fallbacks;
 *   server callers should pass the admin-configured values from
 *   `getTicketStockLimits()`.
 */
export const getStockInfo = (
  category: TicketCategory,
  currentStage: PriceStage,
  stockCounts: StageStockCounts,
  limits: GlobalStockLimits = GLOBAL_STOCK_LIMITS
): StockInfo => {
  // VIP global limit
  if (category === 'vip') {
    return stockFromLimit(limits.vip, stockCounts.byCategory.vip || 0);
  }

  // Student/Unemployed global limit
  if (category === 'standard_student_unemployed') {
    return stockFromLimit(
      limits.student_unemployed,
      stockCounts.byCategory.standard_student_unemployed || 0
    );
  }

  const constraints: StockInfo[] = [];

  // Standard is bounded by the total-attendee cap, measured against every
  // confirmed ticket rather than standard sales alone.
  if (category === 'standard' && limits.standard_total !== null) {
    constraints.push(stockFromLimit(limits.standard_total, getTotalTicketsSold(stockCounts)));
  }

  // Stage-specific batch limits (e.g. the 30-ticket blind-bird batch)
  const stageConfig = getStageConfig(currentStage);
  const stageLimit = stageConfig?.stockLimits?.stageLimit;
  if (stageLimit && (stageConfig?.stockLimits?.limitedCategories || []).includes(category)) {
    constraints.push(stockFromLimit(stageLimit, stockCounts.byStage[currentStage] || 0));
  }

  // No limit applies to this category/stage
  if (constraints.length === 0) {
    return {
      remaining: null,
      total: null,
      soldOut: false,
    };
  }

  // Tightest constraint wins — it is the one that gates the sale
  return constraints.reduce((tightest, candidate) =>
    (candidate.remaining ?? 0) < (tightest.remaining ?? 0) ? candidate : tightest
  );
};
