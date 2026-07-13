/**
 * Discount Popup A/B Experiment
 *
 * PostHog-driven experiment comparing the standard popup offer against a more
 * aggressive short-lived one:
 * - `control`       → 10% off, valid 2h (existing behavior, env-configurable)
 * - `aggressive-20` → 20% off, valid 1h (env-configurable)
 *
 * The client only ever sends the *variant key* to the API — the actual
 * percentage and duration are resolved server-side so clients cannot mint
 * arbitrary discounts.
 *
 * PostHog setup (one-time, in the PostHog UI):
 * 1. Create an experiment with feature flag key `discount-popup-offer` and
 *    variants `control` / `aggressive-20` (50/50 split).
 * 2. Add a release condition excluding known buyers:
 *    `is_ticket_holder is not set` (the success page sets this person property).
 */

import type { DiscountVariantConfig } from './types';
import { getServerConfig } from './config';

/** PostHog feature flag key for the discount popup experiment. */
export const DISCOUNT_EXPERIMENT_FLAG = 'discount-popup-offer';

export const DISCOUNT_VARIANTS = ['control', 'aggressive-20'] as const;

export type DiscountVariant = (typeof DISCOUNT_VARIANTS)[number];

export function isDiscountVariant(value: unknown): value is DiscountVariant {
  return (
    typeof value === 'string' &&
    (DISCOUNT_VARIANTS as readonly string[]).includes(value)
  );
}

/**
 * Resolves the offer for a variant server-side.
 * Control mirrors the standard env-driven config; the aggressive variant
 * defaults to 20% off for 60 minutes and can be tuned via env without a deploy.
 */
export function getVariantServerConfig(
  variant: DiscountVariant
): DiscountVariantConfig {
  const base = getServerConfig();

  if (variant === 'aggressive-20') {
    return {
      percentOff: parseInt(process.env.DISCOUNT_AB_PERCENT_OFF || '20', 10),
      durationMinutes: parseInt(
        process.env.DISCOUNT_AB_DURATION_MINUTES || '60',
        10
      ),
    };
  }

  return {
    percentOff: base.percentOff,
    durationMinutes: base.durationMinutes,
  };
}
