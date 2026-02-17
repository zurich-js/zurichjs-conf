import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClientConfig, getServerConfig, COOKIE_NAMES } from '../config';

describe('COOKIE_NAMES', () => {
  it('has expected cookie name constants', () => {
    expect(COOKIE_NAMES.COOLDOWN).toBe('discount_cooldown');
    expect(COOKIE_NAMES.DISMISSED).toBe('discount_dismissed');
  });
});

describe('getClientConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_DISCOUNT_FORCE_SHOW', '');
    vi.stubEnv('NEXT_PUBLIC_DISCOUNT_SHOW_PROBABILITY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns defaults when env vars are not set', () => {
    const config = getClientConfig();
    expect(config.forceShow).toBe(false);
    expect(config.showProbability).toBe(0.25);
  });

  it('parses forceShow from env', () => {
    vi.stubEnv('NEXT_PUBLIC_DISCOUNT_FORCE_SHOW', 'true');
    expect(getClientConfig().forceShow).toBe(true);
  });

  it('parses showProbability from env', () => {
    vi.stubEnv('NEXT_PUBLIC_DISCOUNT_SHOW_PROBABILITY', '0.75');
    expect(getClientConfig().showProbability).toBe(0.75);
  });

  it('returns NaN for non-numeric probability (documents behavior)', () => {
    vi.stubEnv('NEXT_PUBLIC_DISCOUNT_SHOW_PROBABILITY', 'not-a-number');
    const config = getClientConfig();
    expect(Number.isNaN(config.showProbability)).toBe(true);
  });
});

describe('getServerConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns defaults when env vars are not set', () => {
    const config = getServerConfig();
    expect(config.showProbability).toBe(0.25);
    expect(config.percentOff).toBe(10);
    expect(config.durationMinutes).toBe(120);
    expect(config.cooldownHours).toBe(24);
    expect(config.forceShow).toBe(false);
  });

  it('parses all config from env vars', () => {
    vi.stubEnv('DISCOUNT_SHOW_PROBABILITY', '0.5');
    vi.stubEnv('DISCOUNT_PERCENT_OFF', '20');
    vi.stubEnv('DISCOUNT_DURATION_MINUTES', '60');
    vi.stubEnv('DISCOUNT_COOLDOWN_HOURS', '12');
    vi.stubEnv('NEXT_PUBLIC_DISCOUNT_FORCE_SHOW', 'true');

    const config = getServerConfig();
    expect(config.showProbability).toBe(0.5);
    expect(config.percentOff).toBe(20);
    expect(config.durationMinutes).toBe(60);
    expect(config.cooldownHours).toBe(12);
    expect(config.forceShow).toBe(true);
  });
});
