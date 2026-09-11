/**
 * Unit Tests for Checkout Price Validation
 *
 * Verifies that validateCheckoutPrices accepts prices matching the current
 * pricing stage and rejects prices from expired stages — including the
 * last_minute stage covering the final two weeks before the conference.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Stripe from 'stripe';
import { TICKET_SALES_CLOSED_MESSAGE } from '@/config/pricing-stages';
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
        last_minute: 0,
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

  it('accepts last_minute prices during the last_minute window', async () => {
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    const stripe = createMockStripe({
      price_1: 'standard_last_minute',
    });

    const result = await validateCheckoutPrices(stripe, ['price_1']);

    expect(result.valid).toBe(true);
    expect(result.currentStage).toBe('last_minute');
  });

  it('accepts VIP late_bird prices during the last_minute window (VIP tops out at late bird)', async () => {
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    const stripe = createMockStripe({
      price_1: 'vip_late_bird',
      price_2: 'vip_late_bird_eur',
    });

    const result = await validateCheckoutPrices(stripe, ['price_1', 'price_2']);

    expect(result.valid).toBe(true);
    expect(result.currentStage).toBe('last_minute');
  });

  it('rejects late_bird prices during the last_minute window', async () => {
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    const stripe = createMockStripe({ price_1: 'standard_late_bird' });

    const result = await validateCheckoutPrices(stripe, ['price_1']);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('late bird');
    expect(result.currentStage).toBe('last_minute');
  });

  it('rejects last_minute prices before the last_minute window opens', async () => {
    vi.setSystemTime(new Date('2026-08-15T00:00:00.000Z'));
    const stripe = createMockStripe({ price_1: 'standard_last_minute' });

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

  describe('once ticket sales have closed', () => {
    beforeEach(() => {
      // Conference day — the last_minute window ended at midnight UTC
      vi.setSystemTime(new Date('2026-09-11T08:00:00.000Z'));
    });

    it('rejects the final-stage price that was valid a moment before', async () => {
      const stripe = createMockStripe({ price_1: 'standard_last_minute' });

      const result = await validateCheckoutPrices(stripe, ['price_1']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(TICKET_SALES_CLOSED_MESSAGE);
    });

    it('rejects VIP at its capped late_bird price', async () => {
      const stripe = createMockStripe({ price_1: 'vip_late_bird_eur' });

      const result = await validateCheckoutPrices(stripe, ['price_1']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(TICKET_SALES_CLOSED_MESSAGE);
    });

    it('rejects student/unemployed tickets even though they have no stage', async () => {
      const stripe = createMockStripe({ price_1: 'standard_student_unemployed' });

      const result = await validateCheckoutPrices(stripe, ['price_1']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(TICKET_SALES_CLOSED_MESSAGE);
    });

    it('rejects the "standard" price the post-window fallback used to allow', async () => {
      // Before the closure gate, a post-window checkout fell back to the
      // standard stage and would have gone through at standard pricing.
      const stripe = createMockStripe({ price_1: 'standard_standard' });

      const result = await validateCheckoutPrices(stripe, ['price_1']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(TICKET_SALES_CLOSED_MESSAGE);
    });

    it('still lets non-ticket prices through (workshops gate themselves)', async () => {
      const stripe = createMockStripe({ price_1: 'workshop_agentic_js' });

      const result = await validateCheckoutPrices(stripe, ['price_1']);

      expect(result.valid).toBe(true);
    });
  });
});
