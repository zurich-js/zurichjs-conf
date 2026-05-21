/**
 * Shared sponsorship currency literals.
 *
 * This file is safe for both client and server imports.
 */

export const SPONSORSHIP_CURRENCIES = ['CHF', 'EUR', 'GBP', 'USD'] as const;
export type SponsorshipDisplayCurrency = typeof SPONSORSHIP_CURRENCIES[number];

export function isSponsorshipDisplayCurrency(value: unknown): value is SponsorshipDisplayCurrency {
  return SPONSORSHIP_CURRENCIES.includes(value as SponsorshipDisplayCurrency);
}
