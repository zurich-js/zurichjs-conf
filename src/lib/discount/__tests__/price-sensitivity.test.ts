/**
 * Tests for the price-sensitivity eligibility rules (variant C).
 */

import { describe, it, expect } from 'vitest';
import {
  LOWER_INCOME_EUROPEAN_COUNTRIES,
  PRICE_SENSITIVE_MIN_VISITS,
  isLowerIncomeEuropeanCountry,
  getPriceSensitivityEligibility,
} from '../price-sensitivity';

describe('isLowerIncomeEuropeanCountry', () => {
  it('matches countries on the list, case-insensitively', () => {
    expect(isLowerIncomeEuropeanCountry('RS')).toBe(true); // Serbia
    expect(isLowerIncomeEuropeanCountry('MK')).toBe(true); // North Macedonia
    expect(isLowerIncomeEuropeanCountry('PT')).toBe(true); // Portugal
    expect(isLowerIncomeEuropeanCountry('pt')).toBe(true);
  });

  it('rejects wealthy European neighbors and missing values', () => {
    expect(isLowerIncomeEuropeanCountry('CH')).toBe(false);
    expect(isLowerIncomeEuropeanCountry('DE')).toBe(false);
    expect(isLowerIncomeEuropeanCountry('FR')).toBe(false);
    expect(isLowerIncomeEuropeanCountry('GB')).toBe(false);
    expect(isLowerIncomeEuropeanCountry(null)).toBe(false);
    expect(isLowerIncomeEuropeanCountry(undefined)).toBe(false);
    expect(isLowerIncomeEuropeanCountry('')).toBe(false);
  });

  it('rejects non-European lower-income countries — the gate is Europe-focused', () => {
    expect(isLowerIncomeEuropeanCountry('IN')).toBe(false);
    expect(isLowerIncomeEuropeanCountry('NG')).toBe(false);
  });

  it('the list holds only alpha-2 codes and excludes payment-restricted countries', () => {
    for (const code of LOWER_INCOME_EUROPEAN_COUNTRIES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
    expect(LOWER_INCOME_EUROPEAN_COUNTRIES.has('RU')).toBe(false);
    expect(LOWER_INCOME_EUROPEAN_COUNTRIES.has('BY')).toBe(false);
  });
});

describe('getPriceSensitivityEligibility', () => {
  it('qualifies visitors from lower-income European countries regardless of visit count', () => {
    expect(getPriceSensitivityEligibility({ countryCode: 'RS', visitCount: 1 })).toEqual({
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
    expect(getPriceSensitivityEligibility({ countryCode: 'MK', visitCount: 7 })).toEqual({
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
