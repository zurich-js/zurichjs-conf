/**
 * Tests for the discount popup A/B/C experiment helpers.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DISCOUNT_EXPERIMENT_FLAG,
  DISCOUNT_VARIANTS,
  isDiscountVariant,
  getVariantServerConfig,
  applyPriceSensitivityGate,
} from '../experiment';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isDiscountVariant', () => {
  it('accepts every known variant', () => {
    for (const variant of DISCOUNT_VARIANTS) {
      expect(isDiscountVariant(variant)).toBe(true);
    }
  });

  it('rejects unknown strings and non-strings', () => {
    expect(isDiscountVariant('aggressive-50')).toBe(false);
    expect(isDiscountVariant('')).toBe(false);
    expect(isDiscountVariant(undefined)).toBe(false);
    expect(isDiscountVariant(null)).toBe(false);
    expect(isDiscountVariant(false)).toBe(false);
    expect(isDiscountVariant(20)).toBe(false);
  });
});

describe('getVariantServerConfig', () => {
  it('control mirrors the standard server config defaults', () => {
    const config = getVariantServerConfig('control');
    expect(config).toEqual({ percentOff: 10, durationMinutes: 120 });
  });

  it('control follows DISCOUNT_PERCENT_OFF / DISCOUNT_DURATION_MINUTES env', () => {
    vi.stubEnv('DISCOUNT_PERCENT_OFF', '12');
    vi.stubEnv('DISCOUNT_DURATION_MINUTES', '90');

    const config = getVariantServerConfig('control');
    expect(config).toEqual({ percentOff: 12, durationMinutes: 90 });
  });

  it('aggressive-20 defaults to 20% off for 60 minutes', () => {
    const config = getVariantServerConfig('aggressive-20');
    expect(config).toEqual({ percentOff: 20, durationMinutes: 60 });
  });

  it('aggressive-20 follows DISCOUNT_AB_* env overrides', () => {
    vi.stubEnv('DISCOUNT_AB_PERCENT_OFF', '25');
    vi.stubEnv('DISCOUNT_AB_DURATION_MINUTES', '30');

    const config = getVariantServerConfig('aggressive-20');
    expect(config).toEqual({ percentOff: 25, durationMinutes: 30 });
  });

  it('price-sensitive-30 defaults to 30% off for 30 minutes', () => {
    const config = getVariantServerConfig('price-sensitive-30');
    expect(config).toEqual({ percentOff: 30, durationMinutes: 30 });
  });

  it('price-sensitive-30 follows DISCOUNT_ABC_* env overrides', () => {
    vi.stubEnv('DISCOUNT_ABC_PERCENT_OFF', '35');
    vi.stubEnv('DISCOUNT_ABC_DURATION_MINUTES', '20');

    const config = getVariantServerConfig('price-sensitive-30');
    expect(config).toEqual({ percentOff: 35, durationMinutes: 20 });
  });
});

describe('applyPriceSensitivityGate', () => {
  it('passes price-sensitive-30 through for eligible visitors', () => {
    expect(applyPriceSensitivityGate('price-sensitive-30', true)).toEqual({
      variant: 'price-sensitive-30',
      downgraded: false,
    });
  });

  it('downgrades price-sensitive-30 to control for ineligible visitors', () => {
    expect(applyPriceSensitivityGate('price-sensitive-30', false)).toEqual({
      variant: 'control',
      downgraded: true,
    });
  });

  it('never touches the other variants regardless of eligibility', () => {
    for (const eligible of [true, false]) {
      expect(applyPriceSensitivityGate('control', eligible)).toEqual({
        variant: 'control',
        downgraded: false,
      });
      expect(applyPriceSensitivityGate('aggressive-20', eligible)).toEqual({
        variant: 'aggressive-20',
        downgraded: false,
      });
    }
  });
});

describe('flag key', () => {
  it('is stable — changing it silently resets the experiment in PostHog', () => {
    expect(DISCOUNT_EXPERIMENT_FLAG).toBe('discount-popup-offer');
  });
});
