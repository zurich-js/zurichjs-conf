import { describe, expect, it, vi } from 'vitest';

// Mock server-only dependencies before importing
vi.mock('@/lib/supabase/client', () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    track: vi.fn(),
    flush: vi.fn(),
  },
}));

import { generateReferralCode, getRewardForTier } from '..';
import type { ReferralTier } from '../types';

describe('generateReferralCode', () => {
  it('produces REF- prefixed codes', () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^REF-[A-Z0-9]{8}$/);
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    expect(codes.size).toBe(100);
  });
});

describe('getRewardForTier', () => {
  const tiers: ReferralTier[] = [
    { min_referrals: 1, max_referrals: 3, reward_amount_chf: 1000, reward_amount_eur: 900, reward_amount_gbp: 800, reward_amount_usd: 1100 },
    { min_referrals: 4, max_referrals: 8, reward_amount_chf: 1500, reward_amount_eur: 1350, reward_amount_gbp: 1200, reward_amount_usd: 1650 },
    { min_referrals: 9, max_referrals: null, reward_amount_chf: 2500, reward_amount_eur: 2250, reward_amount_gbp: 2000, reward_amount_usd: 2750 },
  ];

  it('returns tier 1 for 1-3 referrals', () => {
    expect(getRewardForTier(tiers, 1, 'CHF')).toEqual({ tier: 1, amount: 1000 });
    expect(getRewardForTier(tiers, 3, 'CHF')).toEqual({ tier: 1, amount: 1000 });
  });

  it('returns tier 2 for 4-8 referrals', () => {
    expect(getRewardForTier(tiers, 4, 'CHF')).toEqual({ tier: 2, amount: 1500 });
    expect(getRewardForTier(tiers, 8, 'CHF')).toEqual({ tier: 2, amount: 1500 });
  });

  it('returns tier 3 for 9+ referrals', () => {
    expect(getRewardForTier(tiers, 9, 'CHF')).toEqual({ tier: 3, amount: 2500 });
    expect(getRewardForTier(tiers, 100, 'CHF')).toEqual({ tier: 3, amount: 2500 });
  });

  it('respects currency', () => {
    expect(getRewardForTier(tiers, 1, 'EUR')).toEqual({ tier: 1, amount: 900 });
    expect(getRewardForTier(tiers, 1, 'GBP')).toEqual({ tier: 1, amount: 800 });
    expect(getRewardForTier(tiers, 1, 'USD')).toEqual({ tier: 1, amount: 1100 });
  });

  it('falls back to CHF for unknown currency', () => {
    expect(getRewardForTier(tiers, 1, 'JPY')).toEqual({ tier: 1, amount: 1000 });
  });
});
