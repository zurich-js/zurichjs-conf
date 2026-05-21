import { describe, expect, it } from 'vitest';
import {
  convertChfMinorToCurrency,
  convertCurrencyMinorToChf,
  roundMinorToNearestUnits,
} from '@/lib/sponsorship/currency-math';

describe('sponsorship currency helpers', () => {
  it('rounds minor amounts to the nearest whole currency unit increment', () => {
    expect(roundMinorToNearestUnits(256300, 100)).toBe(260000);
    expect(roundMinorToNearestUnits(243000, 100)).toBe(240000);
  });

  it('converts CHF to sponsor display currency rounded to nearest 100 units', () => {
    expect(convertChfMinorToCurrency(250000, 'EUR', { EUR: 1.0252 }, 100)).toBe(260000);
    expect(convertChfMinorToCurrency(250000, 'EUR', { EUR: 0.972 }, 100)).toBe(240000);
  });

  it('converts sponsor currency to CHF rounded to nearest 1 CHF', () => {
    expect(convertCurrencyMinorToChf(700000, 'USD', { USD: 1.06 })).toBe(660400);
  });
});
