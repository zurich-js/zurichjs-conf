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
      percentOff: 10,
      durationMinutes: 120,
      abPercentOff: 20,
      abDurationMinutes: 60,
      recurringPercentOff: 30,
      recurringDurationMinutes: 30,
      recurringMinVisits: 3,
      source: 'env',
    });
  });

  it('no longer carries eligibility-gating fields', () => {
    // The popup is offered to every visitor: there is no show-probability
    // roll, cooldown window or force-show override left to configure.
    expect(getServerConfig()).not.toHaveProperty('showProbability');
    expect(getServerConfig()).not.toHaveProperty('cooldownHours');
    expect(getServerConfig()).not.toHaveProperty('forceShow');
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

  it('ignores env for the recurring-visitor offer', () => {
    // Recurring settings are admin config only; env must not override them or
    // the admin UI would silently disagree with runtime behaviour.
    vi.stubEnv('DISCOUNT_RECURRING_PERCENT_OFF', '99');
    vi.stubEnv('DISCOUNT_RECURRING_MIN_VISITS', '9');

    const config = getServerConfig();
    expect(config.recurringPercentOff).toBe(30);
    expect(config.recurringMinVisits).toBe(3);
  });
});
