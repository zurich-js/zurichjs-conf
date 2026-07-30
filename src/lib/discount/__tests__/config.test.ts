/**
 * Tests for the discount popup env-fallback configuration.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { getServerConfig } from '../config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getServerConfig (env fallback)', () => {
  it('provides the documented defaults when no env is set', () => {
    expect(getServerConfig()).toEqual({
      showProbability: 0.5,
      percentOff: 10,
      durationMinutes: 120,
      cooldownHours: 6,
      forceShow: false,
      abPercentOff: 20,
      abDurationMinutes: 60,
      source: 'env',
    });
  });

  it('follows DISCOUNT_* env overrides', () => {
    vi.stubEnv('DISCOUNT_PERCENT_OFF', '12');
    vi.stubEnv('DISCOUNT_DURATION_MINUTES', '90');
    vi.stubEnv('DISCOUNT_AB_PERCENT_OFF', '25');
    vi.stubEnv('DISCOUNT_AB_DURATION_MINUTES', '30');

    const config = getServerConfig();
    expect(config.percentOff).toBe(12);
    expect(config.durationMinutes).toBe(90);
    expect(config.abPercentOff).toBe(25);
    expect(config.abDurationMinutes).toBe(30);
  });
});
