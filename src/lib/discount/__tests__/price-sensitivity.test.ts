/**
 * Tests for the price-sensitivity eligibility rules (variant C).
 */

import { describe, it, expect } from 'vitest';
import {
  LOW_INCOME_COUNTRIES,
  PRICE_SENSITIVE_MIN_VISITS,
  isLowIncomeCountry,
  getPriceSensitivityEligibility,
} from '../price-sensitivity';

describe('isLowIncomeCountry', () => {
  it('matches countries on the list, case-insensitively', () => {
    expect(isLowIncomeCountry('IN')).toBe(true);
    expect(isLowIncomeCountry('in')).toBe(true);
    expect(isLowIncomeCountry('NG')).toBe(true);
  });

  it('rejects high-income countries and missing values', () => {
    expect(isLowIncomeCountry('CH')).toBe(false);
    expect(isLowIncomeCountry('US')).toBe(false);
    expect(isLowIncomeCountry(null)).toBe(false);
    expect(isLowIncomeCountry(undefined)).toBe(false);
    expect(isLowIncomeCountry('')).toBe(false);
  });

  it('the list holds only ISO alpha-2 codes and excludes sanctioned countries', () => {
    for (const code of LOW_INCOME_COUNTRIES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
    expect(LOW_INCOME_COUNTRIES.has('KP')).toBe(false);
    expect(LOW_INCOME_COUNTRIES.has('IR')).toBe(false);
    expect(LOW_INCOME_COUNTRIES.has('SY')).toBe(false);
  });
});

describe('getPriceSensitivityEligibility', () => {
  it('qualifies visitors from low-income countries regardless of visit count', () => {
    expect(getPriceSensitivityEligibility({ countryCode: 'IN', visitCount: 1 })).toEqual({
      eligible: true,
      reason: 'low_income_country',
    });
  });

  it('qualifies recurring visitors from any country on their 3rd visit', () => {
    expect(
      getPriceSensitivityEligibility({
        countryCode: 'CH',
        visitCount: PRICE_SENSITIVE_MIN_VISITS,
      })
    ).toEqual({ eligible: true, reason: 'recurring_visitor' });
  });

  it('qualifies recurring visitors with unknown country', () => {
    expect(getPriceSensitivityEligibility({ countryCode: null, visitCount: 5 })).toEqual({
      eligible: true,
      reason: 'recurring_visitor',
    });
  });

  it('country reason wins when both conditions hold', () => {
    expect(getPriceSensitivityEligibility({ countryCode: 'NG', visitCount: 7 })).toEqual({
      eligible: true,
      reason: 'low_income_country',
    });
  });

  it('rejects early visits from high-income countries', () => {
    expect(
      getPriceSensitivityEligibility({
        countryCode: 'CH',
        visitCount: PRICE_SENSITIVE_MIN_VISITS - 1,
      })
    ).toEqual({ eligible: false, reason: null });
  });

  it('rejects first-time visitors with unknown country', () => {
    expect(getPriceSensitivityEligibility({ countryCode: null, visitCount: 1 })).toEqual({
      eligible: false,
      reason: null,
    });
  });
});
