/**
 * Price-Sensitivity Eligibility (variant C of the discount popup experiment)
 *
 * The `price-sensitive-30` variant is only offered to visitors who are likely
 * price-sensitive. A visitor qualifies when EITHER:
 * 1. Their detected country is a lower-income European economy relative to
 *    Switzerland (e.g. Serbia, North Macedonia, Portugal — the CHF ticket
 *    price is a much bigger ask on local wages), OR
 * 2. They are a recurring visitor — at least their 3rd visit — who still has
 *    not converted (interest is proven, price is the likely blocker).
 *
 * Known ticket holders are excluded upstream (see useDiscount), so "has not
 * converted" is implied by reaching the eligibility check at all.
 *
 * Pure functions — country and visit count are supplied by callers.
 */

import { getCookie } from './cookies';

/** Visits (including the current one) required to count as a recurring visitor. */
export const PRICE_SENSITIVE_MIN_VISITS = 3;

/**
 * European economies with incomes far below Switzerland's — roughly one third
 * or less of Swiss GDP per capita (nominal). This is where the conference
 * actually draws price-sensitive attendees from, unlike a global World Bank
 * cut. ISO 3166-1 alpha-2 (XK = Kosovo, the code geo APIs return).
 * Russia and Belarus are intentionally omitted (payment restrictions make the
 * offer unusable there). Tune as income levels shift — it is an experiment
 * input, not a legal boundary.
 */
export const LOWER_INCOME_EUROPEAN_COUNTRIES: ReadonlySet<string> = new Set([
  // Western Balkans
  'AL', 'BA', 'ME', 'MK', 'RS', 'XK',
  // Eastern Europe
  'BG', 'MD', 'RO', 'UA',
  // Central Europe & Baltics
  'HR', 'HU', 'LT', 'LV', 'PL', 'SK',
  // Southern Europe
  'GR', 'PT',
  // Transcontinental, large European population share
  'TR',
]);

export function isLowerIncomeEuropeanCountry(
  countryCode: string | null | undefined
): boolean {
  if (!countryCode) return false;
  return LOWER_INCOME_EUROPEAN_COUNTRIES.has(countryCode.toUpperCase());
}

export type PriceSensitivityReason = 'low_income_country' | 'recurring_visitor';

export const PRICE_SENSITIVITY_REASONS = [
  'low_income_country',
  'recurring_visitor',
] as const satisfies readonly PriceSensitivityReason[];

export interface PriceSensitivityEligibility {
  eligible: boolean;
  /** Why the visitor qualifies; country wins when both conditions hold. */
  reason: PriceSensitivityReason | null;
}

/**
 * Decides whether the visitor may receive the `price-sensitive-30` variant.
 * Callers must have already excluded converted visitors (ticket holders).
 */
export function getPriceSensitivityEligibility(params: {
  countryCode: string | null;
  visitCount: number;
}): PriceSensitivityEligibility {
  if (isLowerIncomeEuropeanCountry(params.countryCode)) {
    return { eligible: true, reason: 'low_income_country' };
  }
  if (params.visitCount >= PRICE_SENSITIVE_MIN_VISITS) {
    return { eligible: true, reason: 'recurring_visitor' };
  }
  return { eligible: false, reason: null };
}

/**
 * Reads the visitor's country as detected by /api/geo/detect (client-side).
 * CurrencyContext triggers that API on first visit, so by the time the popup
 * fires (15s delay) the cookie is normally present. Honors the same
 * `dev_country` override the geo API uses, outside production.
 */
export function getClientDetectedCountry(): string | null {
  if (process.env.NODE_ENV !== 'production') {
    const devCountry = getCookie('dev_country');
    if (devCountry && /^[A-Za-z]{2}$/.test(devCountry)) {
      return devCountry.toUpperCase();
    }
  }

  const detected = getCookie('detected-country');
  if (detected && /^[A-Za-z]{2}$/.test(detected)) {
    return detected.toUpperCase();
  }
  return null;
}
