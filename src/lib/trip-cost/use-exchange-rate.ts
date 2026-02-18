/**
 * Hook to fetch live EUR/CHF exchange rate from the Frankfurter API (ECB data).
 * Free, no API key required. Updated daily around 16:00 CET.
 * https://frankfurter.dev/
 */

import { useState, useEffect } from 'react';
import { FALLBACK_EUR_RATE } from '@/config/trip-cost';

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ExchangeRateData {
  /** 1 CHF = X EUR */
  eurRate: number;
  /** ISO date of the rate (e.g. "2026-02-18") */
  rateDate: string | null;
  /** Attribution for display */
  rateSource: string;
  /** Whether the rate is still loading */
  isLoading: boolean;
  /** Whether we're using the fallback rate */
  isFallback: boolean;
}

const API_URL = 'https://api.frankfurter.dev/v1/latest?base=CHF&symbols=EUR';

export function useExchangeRate(): ExchangeRateData {
  const [eurRate, setEurRate] = useState(FALLBACK_EUR_RATE);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRate() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FrankfurterResponse = await res.json();
        if (cancelled) return;

        if (data.rates?.EUR) {
          setEurRate(data.rates.EUR);
          setRateDate(data.date);
          setIsFallback(false);
        }
      } catch {
        // Keep fallback rate
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRate();
    return () => { cancelled = true; };
  }, []);

  return {
    eurRate,
    rateDate,
    rateSource: isFallback ? 'Estimated rate' : 'ECB via frankfurter.dev',
    isLoading,
    isFallback,
  };
}
