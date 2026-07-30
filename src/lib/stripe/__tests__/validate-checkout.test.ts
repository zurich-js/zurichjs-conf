/**
 * Unit Tests for Checkout Price Validation
 *
 * Verifies that validateCheckoutPrices accepts prices matching the current
 * pricing stage and rejects prices from expired stages — including the
 * last_call stage covering the final two weeks before the conference.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Stripe from 'stripe';
import { validateCheckoutPrices } from '../validate-checkout';

vi.mock('@/lib/tickets/getTicketCounts', () => ({
  getTicketCounts: vi.fn().mockResolvedValue({
    success: true,
    counts: {
      byStage: {
        blind_bird: 0,
        early_bird: 0,
        standard: 0,
        late_bird: 0,
        last_call: 0,
      },
      byCategory: {
        standard_student_unemployed: 0,
        standard: 0,
        vip: 0,
      },
    },
  }),
}));

const createMockStripe = (pricesByLookupKey: Record<string, string>): Stripe => {
  const retrieve = vi.fn().mockImplementation((id: string) => {
    const lookupKey = pricesByLookupKey[id];
    return Promise.resolve({
      id,
      lookup_key: lookupKey ?? null,
      active: true,
    } as Stripe.Price);
  });
  return { prices: { retrieve } } as unknown as Stripe;
};

describe('validateCheckoutPrices', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts last_call prices during the last_call window', async () => {
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    const stripe = createMockStripe({
      price_1: 'standard_last_call',
      price_2: 'vip_last_call_eur',
    });

    const result = await validateCheckoutPrices(stripe, ['price_1', 'price_2']);

    expect(result.valid).toBe(true);
    expect(result.currentStage).toBe('last_call');
  });

  it('rejects late_bird prices during the last_call window', async () => {
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    const stripe = createMockStripe({ price_1: 'standard_late_bird' });

    const result = await validateCheckoutPrices(stripe, ['price_1']);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('late bird');
    expect(result.currentStage).toBe('last_call');
  });

  it('rejects last_call prices before the last_call window opens', async () => {
    vi.setSystemTime(new Date('2026-08-15T00:00:00.000Z'));
    const stripe = createMockStripe({ price_1: 'standard_last_call' });

    const result = await validateCheckoutPrices(stripe, ['price_1']);

    expect(result.valid).toBe(false);
    expect(result.currentStage).toBe('late_bird');
  });

  it('accepts stage prices matching the current window (late_bird)', async () => {
    vi.setSystemTime(new Date('2026-08-15T00:00:00.000Z'));
    const stripe = createMockStripe({ price_1: 'vip_late_bird_usd' });

    const result = await validateCheckoutPrices(stripe, ['price_1']);

    expect(result.valid).toBe(true);
    expect(result.currentStage).toBe('late_bird');
  });

  it('skips student/unemployed prices (fixed pricing, no stage)', async () => {
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    const stripe = createMockStripe({ price_1: 'standard_student_unemployed' });

    const result = await validateCheckoutPrices(stripe, ['price_1']);

    expect(result.valid).toBe(true);
  });
});
