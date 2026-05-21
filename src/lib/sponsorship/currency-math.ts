/**
 * Client-safe sponsorship currency math.
 *
 * Do not import server-only modules here; this file is used by admin/public
 * React components as well as server code.
 */

import type { SponsorshipDisplayCurrency } from './currency-types';

export function roundMinorToNearestUnits(amountMinor: number, unitIncrement: number): number {
  const incrementMinor = unitIncrement * 100;
  return Math.round(amountMinor / incrementMinor) * incrementMinor;
}

export function convertChfMinorToCurrency(
  chfMinor: number,
  currency: SponsorshipDisplayCurrency,
  rates: Partial<Record<SponsorshipDisplayCurrency, number>>,
  roundingUnit = 100,
): number {
  if (currency === 'CHF') return chfMinor;
  const rate = rates[currency];
  if (!rate) {
    throw new Error(`Missing CHF to ${currency} exchange rate`);
  }
  return roundMinorToNearestUnits(chfMinor * rate, roundingUnit);
}

export function convertCurrencyMinorToChf(
  amountMinor: number,
  currency: SponsorshipDisplayCurrency,
  chfBaseRates: Partial<Record<SponsorshipDisplayCurrency, number>>,
): number {
  if (currency === 'CHF') return roundMinorToNearestUnits(amountMinor, 1);
  const rate = chfBaseRates[currency];
  if (!rate) {
    throw new Error(`Missing CHF to ${currency} exchange rate`);
  }
  return roundMinorToNearestUnits(amountMinor / rate, 1);
}
