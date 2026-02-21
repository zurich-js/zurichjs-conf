/**
 * Hook to fetch live exchange rates from the Frankfurter API (ECB data).
 * Free, no API key required. Updated daily around 16:00 CET.
 * https://frankfurter.dev/
 *
 * Uses TanStack Query for retries and caching — no fallback rates.
 */

import { useQuery } from '@tanstack/react-query';

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

/** Exchange rates keyed by currency code (1 CHF = X of each) */
export type ExchangeRates = Record<string, number>;

export interface ExchangeRateData {
  /** All fetched rates (e.g. { EUR: 0.93, GBP: 0.79, USD: 1.12 }) */
  rates: ExchangeRates;
  /** Convenience: 1 CHF = X EUR (undefined while loading or on error) */
  eurRate: number | undefined;
  /** ISO date of the rate (e.g. "2026-02-18") */
  rateDate: string | null;
  /** Attribution for display */
  rateSource: string;
  /** Whether rates are still loading */
  isLoading: boolean;
  /** Whether rates failed to load after retries */
  isError: boolean;
}

const API_URL = 'https://api.frankfurter.dev/v1/latest?base=CHF&symbols=EUR,GBP,USD';

async function fetchRates(): Promise<{ rates: ExchangeRates; date: string }> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: FrankfurterResponse = await res.json();
  if (!data.rates || Object.keys(data.rates).length === 0) {
    throw new Error('No rates in response');
  }
  return { rates: data.rates, date: data.date };
}

export function useExchangeRate(): ExchangeRateData {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['exchange-rates', 'CHF'],
    queryFn: fetchRates,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  return {
    rates: data?.rates ?? {},
    eurRate: data?.rates?.EUR,
    rateDate: data?.date ?? null,
    rateSource: data ? 'ECB via frankfurter.dev' : '',
    isLoading,
    isError,
  };
}
