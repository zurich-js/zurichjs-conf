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
import { getServerConfig } from '../config';
import type { ResolvedDiscountConfig } from '../types';

/** Resolved config as the admin DB row would produce it */
const BASE_CONFIG: ResolvedDiscountConfig = {
  showProbability: 0.25,
  percentOff: 10,
  durationMinutes: 120,
  cooldownHours: 24,
  forceShow: false,
  abPercentOff: 20,
  abDurationMinutes: 60,
  abcPercentOff: 30,
  abcDurationMinutes: 30,
  source: 'database',
};

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
  it('control mirrors the base offer', () => {
    const config = getVariantServerConfig('control', BASE_CONFIG);
    expect(config).toEqual({ percentOff: 10, durationMinutes: 120 });
  });

  it('aggressive-20 uses the AB offer fields', () => {
    const config = getVariantServerConfig('aggressive-20', {
      ...BASE_CONFIG,
      abPercentOff: 25,
      abDurationMinutes: 45,
    });
    expect(config).toEqual({ percentOff: 25, durationMinutes: 45 });
  });

  it('price-sensitive-30 uses the ABC offer fields', () => {
    const config = getVariantServerConfig('price-sensitive-30', {
      ...BASE_CONFIG,
      abcPercentOff: 35,
      abcDurationMinutes: 20,
    });
    expect(config).toEqual({ percentOff: 35, durationMinutes: 20 });
  });
});

describe('getServerConfig (env fallback)', () => {
  it('provides the documented defaults when no env is set', () => {
    expect(getServerConfig()).toEqual({
      showProbability: 0.25,
      percentOff: 10,
      durationMinutes: 120,
      cooldownHours: 24,
      forceShow: false,
      abPercentOff: 20,
      abDurationMinutes: 60,
      abcPercentOff: 30,
      abcDurationMinutes: 30,
      source: 'env',
    });
  });

  it('follows DISCOUNT_* env overrides for all variants', () => {
    vi.stubEnv('DISCOUNT_PERCENT_OFF', '12');
    vi.stubEnv('DISCOUNT_DURATION_MINUTES', '90');
    vi.stubEnv('DISCOUNT_AB_PERCENT_OFF', '25');
    vi.stubEnv('DISCOUNT_AB_DURATION_MINUTES', '30');
    vi.stubEnv('DISCOUNT_ABC_PERCENT_OFF', '35');
    vi.stubEnv('DISCOUNT_ABC_DURATION_MINUTES', '20');

    const config = getServerConfig();
    expect(getVariantServerConfig('control', config)).toEqual({
      percentOff: 12,
      durationMinutes: 90,
    });
    expect(getVariantServerConfig('aggressive-20', config)).toEqual({
      percentOff: 25,
      durationMinutes: 30,
    });
    expect(getVariantServerConfig('price-sensitive-30', config)).toEqual({
      percentOff: 35,
      durationMinutes: 20,
    });
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
