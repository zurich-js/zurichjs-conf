/**
 * Discount Popup Offer Variants
 *
 * RETIRED EXPERIMENT: the PostHog A/B/C experiment (`discount-popup-offer`)
 * concluded in favor of `aggressive-20`, which the popup now serves to every
 * visitor (see useDiscount) — no PostHog enrollment happens anymore. The
 * variant keys and server-side offer resolution below remain because:
 * - /api/discount/generate resolves the live offer via `aggressive-20`,
 * - all offers stay admin-configurable via the discount_config table
 *   (Admin → Discount tab), with env vars as fallback:
 *   - `control`            → 10% off, valid 2h
 *   - `aggressive-20`      → 20% off, valid 1h (the live offer)
 *   - `price-sensitive-30` → 30% off, valid 30min (unused)
 *
 * The client only ever sends the *variant key* to the API — the actual
 * percentage and duration are resolved server-side so clients cannot mint
 * arbitrary discounts.
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
