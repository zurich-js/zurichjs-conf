/**
 * Stripe-related TypeScript types
 */

/**
 * Price stage types matching Stripe lookup keys
 */
export type PriceStage = 'blind_bird' | 'early_bird' | 'standard' | 'late_bird';

/**
 * Ticket category types
 */
export type TicketCategory = 'super_saver' | 'standard' | 'vip';

/**
 * Stripe price data from API
 */
export interface StripePriceData {
  id: string;
  title: string;
  price: number;
  comparePrice?: number;
  currency: string;
  priceId: string;
  lookupKey: string;
  stage: PriceStage;
}

/**
 * Stage display information
 */
export interface StageInfo {
  name: string;
  label: string;
  description: string;
}

/**
 * Stage metadata mapping
 */
export const STAGE_INFO: Record<PriceStage, StageInfo> = {
  blind_bird: {
    name: 'blind_bird',
    label: 'Blind Bird',
    description: 'Lowest price before speakers are announced',
  },
  early_bird: {
    name: 'early_bird',
    label: 'Early Bird',
    description: 'Special early pricing',
  },
  standard: {
    name: 'standard',
    label: 'Standard',
    description: 'Regular conference pricing',
  },
  late_bird: {
    name: 'late_bird',
    label: 'Late Bird',
    description: 'Last chance pricing',
  },
};

