/**
 * Checkout Price Validation
 * Validates that prices in a checkout request match the current pricing stage.
 * Prevents purchases at expired stage prices (e.g., blind bird during early bird phase).
 */

import type Stripe from 'stripe';
import {
  getCurrentStage,
  getEffectiveStageForCategory,
  type PriceStage,
  type TicketCategory,
} from '@/config/pricing-stages';
import { getTicketCounts } from '@/lib/tickets/getTicketCounts';
import { isTicketProduct, stripCurrencySuffix } from './ticket-utils';

/**
 * Extract the category and pricing stage from a Stripe price's lookup key.
 * Returns null for prices that don't have stage-based pricing (student/unemployed).
 */
function extractPriceInfo(
  lookupKey: string
): { category: TicketCategory; stage: PriceStage } | null {
  const normalized = stripCurrencySuffix(lookupKey);

  // Student/unemployed tickets have fixed pricing — no stage
  if (normalized.includes('student') || normalized.includes('unemployed')) {
    return null;
  }

  // Parse category_stage pattern (e.g., "standard_blind_bird", "vip_early_bird")
  const firstUnderscoreIndex = normalized.indexOf('_');
  if (firstUnderscoreIndex === -1) return null;

  const category = normalized.substring(0, firstUnderscoreIndex) as TicketCategory;
  const stageKey = normalized.substring(firstUnderscoreIndex + 1);

  const stageMap: Record<string, PriceStage> = {
    blind_bird: 'blind_bird',
    early_bird: 'early_bird',
    standard: 'standard',
    general: 'standard',
    late_bird: 'late_bird',
    last_minute: 'last_minute',
  };

  const stage = stageMap[stageKey];
  return stage ? { category, stage } : null;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  currentStage?: PriceStage;
}

/**
 * Validate that all price IDs correspond to the current pricing stage.
 * Rejects prices from expired stages (e.g., blind bird prices during early bird phase).
 */
export async function validateCheckoutPrices(
  stripe: Stripe,
  priceIds: string[]
): Promise<ValidationResult> {
  const { counts } = await getTicketCounts();
  const currentStageConfig = getCurrentStage(counts);
  const currentStage = currentStageConfig.stage;

  // Deduplicate and fetch all prices in parallel
  const uniquePriceIds = [...new Set(priceIds)];
  const prices = await Promise.all(
    uniquePriceIds.map((id) => stripe.prices.retrieve(id))
  );

  for (const price of prices) {
    // Skip non-ticket products (workshop vouchers, etc.)
    if (!isTicketProduct(price)) continue;

    const lookupKey = price.lookup_key;
    if (!lookupKey) continue;

    const priceInfo = extractPriceInfo(lookupKey);

    // Skip prices without a stage (student/unemployed — fixed pricing)
    if (priceInfo === null) continue;

    // Categories capped at an earlier stage (VIP tops out at late bird) are
    // still sold at their cap-stage price once the ladder moves past it.
    const expectedStage = getEffectiveStageForCategory(priceInfo.category, currentStage);

    if (priceInfo.stage !== expectedStage) {
      return {
        valid: false,
        error: `Ticket pricing has changed. The ${priceInfo.stage.replace(/_/g, ' ')} phase is no longer active. Please refresh the page and try again.`,
        currentStage,
      };
    }
  }

  return { valid: true, currentStage };
}
