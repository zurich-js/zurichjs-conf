/**
 * Sponsorship currency conversion helpers.
 *
 * CHF is the operating currency. Sponsor-facing EUR/GBP/USD amounts are
 * converted from CHF for display, and invoice communication amounts can be
 * converted back to CHF for bank transfer requests.
 */

import { fetchWithRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';
export {
  convertChfMinorToCurrency,
  convertCurrencyMinorToChf,
  roundMinorToNearestUnits,
} from '@/lib/sponsorship/currency-math';
export {
  isSponsorshipDisplayCurrency,
  SPONSORSHIP_CURRENCIES,
  type SponsorshipDisplayCurrency,
} from '@/lib/sponsorship/currency-types';

const log = logger.scope('Sponsorship Currency');

import type { SponsorshipDisplayCurrency } from '@/lib/sponsorship/currency-types';

export interface ExchangeRatesResult {
  base: SponsorshipDisplayCurrency;
  rates: Partial<Record<SponsorshipDisplayCurrency, number>>;
  date: string;
  source: string;
  fetchedAt: string;
  isStale: boolean;
}

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CacheEntry {
  result: ExchangeRatesResult;
  fetchedAtMs: number;
}

const API_BASE = 'https://api.frankfurter.dev/v1/latest';
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(base: SponsorshipDisplayCurrency, symbols: readonly SponsorshipDisplayCurrency[]): string {
  return `${base}:${[...symbols].sort().join(',')}`;
}

function assertRatesResponse(
  data: FrankfurterResponse,
  base: SponsorshipDisplayCurrency,
  symbols: readonly SponsorshipDisplayCurrency[],
): void {
  if (data.base !== base) {
    throw new Error(`Unexpected FX base ${data.base}`);
  }

  for (const symbol of symbols) {
    if (symbol === base) continue;
    const rate = data.rates[symbol];
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Missing or invalid FX rate for ${symbol}`);
    }
  }
}

export async function getExchangeRates(
  base: SponsorshipDisplayCurrency = 'CHF',
  symbols: readonly SponsorshipDisplayCurrency[] = ['EUR', 'GBP', 'USD'],
): Promise<ExchangeRatesResult> {
  const filteredSymbols = symbols.filter((symbol) => symbol !== base);
  const key = cacheKey(base, filteredSymbols);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.fetchedAtMs < CACHE_TTL_MS) {
    return { ...cached.result, isStale: false };
  }

  const url = `${API_BASE}?base=${base}&symbols=${filteredSymbols.join(',')}`;

  try {
    const response = await fetchWithRetry(url, undefined, {
      attempts: 3,
      label: `Frankfurter ${base}`,
    });

    if (!response.ok) {
      throw new Error(`FX request failed with HTTP ${response.status}`);
    }

    const data = await response.json() as FrankfurterResponse;
    assertRatesResponse(data, base, filteredSymbols);

    const result: ExchangeRatesResult = {
      base,
      rates: data.rates as Partial<Record<SponsorshipDisplayCurrency, number>>,
      date: data.date,
      source: 'ECB via Frankfurter',
      fetchedAt: new Date(now).toISOString(),
      isStale: false,
    };

    cache.set(key, { result, fetchedAtMs: now });
    return result;
  } catch (error) {
    if (cached) {
      log.warn('Using stale exchange rates after fetch failure', {
        base,
        symbols: filteredSymbols,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return { ...cached.result, isStale: true };
    }

    throw error;
  }
}
