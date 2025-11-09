/**
 * Centralized Pricing Stage Configuration
 *
 * This file defines when each pricing phase starts/ends for the conference.
 * Used by both the pricing API and UI components to ensure consistency.
 *
 * Update these dates to control pricing tiers throughout the sales cycle.
 */

/**
 * Price stage types
 */
export type PriceStage = 'blind_bird' | 'early_bird' | 'standard' | 'late_bird';

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
  /** When this stage ends (exclusive) */
  endDate: Date;
  /** Priority for stage selection (lower = earlier/cheaper) */
  priority: number;
  /** Short description of this stage */
  description: string;
}

/**
 * Pricing stage configurations
 *
 * IMPORTANT: Update these dates based on your conference schedule
 * Stages are evaluated in priority order, and the current date determines which is active.
 */
export const PRICING_STAGES: StageConfig[] = [
  {
    stage: 'blind_bird',
    displayName: 'Blind Bird',
    startDate: new Date('2025-11-05T00:00:00.000Z'),
    endDate: new Date('2026-01-01T00:00:00.000Z'),
    priority: 1,
    description: 'Lowest price - before keynote speakers announced',
  },
  {
    stage: 'early_bird',
    displayName: 'Early Bird',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-04-15T00:00:00.000Z'),
    priority: 2,
    description: 'Save now - early bird pricing',
  },
  {
    stage: 'standard',
    displayName: 'Standard',
    startDate: new Date('2026-04-15T00:00:00.000Z'),
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
 * Get the current active pricing stage based on the current date
 */
export const getCurrentStage = (): StageConfig => {
  const now = new Date();

  const activeStage = PRICING_STAGES.find(
    (config) => now >= config.startDate && now < config.endDate
  );

  // Default to standard if no active stage found
  return activeStage || PRICING_STAGES.find(s => s.stage === 'standard')!;
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
export const isStageActive = (stage: PriceStage): boolean => {
  const now = new Date();
  const config = getStageConfig(stage);

  if (!config) return false;

  return now >= config.startDate && now < config.endDate;
};

/**
 * Get the end date of the current stage (for countdown purposes)
 */
export const getCurrentStageEndDate = (): Date => {
  return getCurrentStage().endDate;
};
