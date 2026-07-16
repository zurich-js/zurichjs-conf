/**
 * Discount Popup A/B/C Experiment
 *
 * PostHog-driven experiment comparing the standard popup offer against a more
 * aggressive short-lived one, plus a price-sensitivity variant. All offers are
 * admin-configurable via the discount_config table (Admin → Discount tab),
 * with env vars as fallback:
 * - `control`            → 10% off, valid 2h (existing behavior)
 * - `aggressive-20`      → 20% off, valid 1h
 * - `price-sensitive-30` → 30% off, valid 30min — only for
 *   visitors in lower-income European countries (relative to Switzerland,
 *   e.g. Serbia, North Macedonia, Portugal) OR recurring (3rd+ visit)
 *   visitors who have not converted. See `price-sensitivity.ts`.
 *
 * The client only ever sends the *variant key* to the API — the actual
 * percentage and duration are resolved server-side so clients cannot mint
 * arbitrary discounts.
 *
 * PostHog setup (one-time, in the PostHog UI):
 * 1. Create an experiment with feature flag key `discount-popup-offer` and
 *    variants `control` / `aggressive-20` / `price-sensitive-30`.
 * 2. Add a release condition excluding known buyers:
 *    `is_ticket_holder is not set` (the success page sets this person property).
 * 3. For the C variant, add a variant override targeting
 *    `price_sensitive_eligible = true` — the client reports this via
 *    `setPersonPropertiesForFlags` before evaluating the flag. The client
 *    additionally downgrades an assigned-but-ineligible C to control as a
 *    hard guard (tracked as `variant_downgraded` on `discount_popup_shown`),
 *    so misconfigured targeting can't leak the 30% offer.
 */

import type { DiscountVariantConfig, ResolvedDiscountConfig } from './types';

/** PostHog feature flag key for the discount popup experiment. */
export const DISCOUNT_EXPERIMENT_FLAG = 'discount-popup-offer';

export const DISCOUNT_VARIANTS = [
  'control',
  'aggressive-20',
  'price-sensitive-30',
] as const;

export type DiscountVariant = (typeof DISCOUNT_VARIANTS)[number];

export function isDiscountVariant(value: unknown): value is DiscountVariant {
  return (
    typeof value === 'string' &&
    (DISCOUNT_VARIANTS as readonly string[]).includes(value)
  );
}

/**
 * Resolves the offer for a variant from the resolved runtime config
 * (admin-editable discount_config row, or the env fallback — see
 * config-server.ts). Pure so it's trivially testable.
 */
export function getVariantServerConfig(
  variant: DiscountVariant,
  config: ResolvedDiscountConfig
): DiscountVariantConfig {
  if (variant === 'aggressive-20') {
    return {
      percentOff: config.abPercentOff,
      durationMinutes: config.abDurationMinutes,
    };
  }

  if (variant === 'price-sensitive-30') {
    return {
      percentOff: config.abcPercentOff,
      durationMinutes: config.abcDurationMinutes,
    };
  }

  return {
    percentOff: config.percentOff,
    durationMinutes: config.durationMinutes,
  };
}

export interface GatedVariant {
  variant: DiscountVariant;
  /** True when PostHog assigned `price-sensitive-30` to an ineligible visitor. */
  downgraded: boolean;
}

/**
 * Hard guard for the C variant: an assigned `price-sensitive-30` that the
 * visitor is not eligible for falls back to the control offer. Downgrades are
 * tracked so the analysis can spot targeting misconfiguration in PostHog.
 */
export function applyPriceSensitivityGate(
  variant: DiscountVariant,
  priceSensitiveEligible: boolean
): GatedVariant {
  if (variant === 'price-sensitive-30' && !priceSensitiveEligible) {
    return { variant: 'control', downgraded: true };
  }
  return { variant, downgraded: false };
}
