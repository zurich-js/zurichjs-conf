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
export type PriceStage = 'blind_bird' | 'early_bird' | 'standard' | 'late_bird';

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
 */
export interface GlobalStockLimits {
  /** VIP tickets are limited globally across all stages */
  vip: number;
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
  vip: 15,
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
 * - Early bird: Jan 1, 2026 -> May 15, 2026
 * - Standard (General Admission): May 15, 2026 -> Aug 1, 2026
 * - Late bird: Aug 1, 2026 -> Sep 11, 2026
 *
 * Stock limits:
 * - Blind bird: 30 tickets total (standard + VIP combined)
 * - VIP: 15 tickets global (across all stages)
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
    endDate: new Date('2026-05-15T00:00:00.000Z'),
    priority: 2,
    description: 'Save now - early bird pricing',
  },
  {
    stage: 'standard',
    displayName: 'General Admission',
    startDate: new Date('2026-05-15T00:00:00.000Z'),
    endDate: new Date('2026-08-01T00:00:00.000Z'),
    priority: 3,
    description: 'Regular pricing',
  },
  {
    stage: 'late_bird',
    displayName: 'Late Bird',
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-09-11T00:00:00.000Z'),
    priority: 4,
    description: 'Final pricing - last chance',
  },
];

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
 * Calculate remaining stock for a category in the current stage
 */
export const getStockInfo = (
  category: TicketCategory,
  currentStage: PriceStage,
  stockCounts: StageStockCounts
): StockInfo => {
  const stageConfig = getStageConfig(currentStage);

  // Check VIP global limit
  if (category === 'vip') {
    const vipSold = stockCounts.byCategory.vip || 0;
    const vipTotal = GLOBAL_STOCK_LIMITS.vip;
    return {
      remaining: Math.max(0, vipTotal - vipSold),
      total: vipTotal,
      soldOut: vipSold >= vipTotal,
    };
  }

  // Check stage-specific stock limits
  if (stageConfig?.stockLimits?.stageLimit) {
    const limitedCategories = stageConfig.stockLimits.limitedCategories || [];
    if (limitedCategories.includes(category)) {
      const soldInStage = stockCounts.byStage[currentStage] || 0;
      const stageLimit = stageConfig.stockLimits.stageLimit;
      return {
        remaining: Math.max(0, stageLimit - soldInStage),
        total: stageLimit,
        soldOut: soldInStage >= stageLimit,
      };
    }
  }

  // No limit for this category/stage
  return {
    remaining: null,
    total: null,
    soldOut: false,
  };
};
