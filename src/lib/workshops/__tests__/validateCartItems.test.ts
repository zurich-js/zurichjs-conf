import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type { CartItem } from '@/types/cart';

const mocks = vi.hoisted(() => {
  const queryResult: { data: unknown[] | null; error: { message: string } | null } = {
    data: [],
    error: null,
  };
  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    in: vi.fn(() => Promise.resolve(queryResult)),
  };
  return {
    queryBuilder,
    queryResult,
    supabaseFrom: vi.fn(() => queryBuilder),
    loggerWarn: vi.fn(),
  };
});

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({ from: mocks.supabaseFrom })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: mocks.loggerWarn,
      error: vi.fn(),
    })),
  },
}));

import { validateWorkshopCartItems } from '../validateCartItems';

const WORKSHOP_ID = 'ws-1';
const PRICE_ID = 'price_workshop_chf';

function makeWorkshopRow(overrides: Record<string, unknown> = {}) {
  return {
    id: WORKSHOP_ID,
    title: 'Deep Dive Workshop',
    status: 'published',
    capacity: 20,
    enrolled_count: 5,
    stripe_product_id: 'prod_workshop',
    stripe_price_lookup_key: 'workshop_deep_dive',
    date: '2026-09-10',
    start_time: '09:00:00',
    end_time: '12:00:00',
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: `workshop_${WORKSHOP_ID}`,
    kind: 'workshop',
    workshopId: WORKSHOP_ID,
    title: 'Deep Dive Workshop',
    price: 250,
    currency: 'CHF',
    priceId: PRICE_ID,
    quantity: 1,
    ...overrides,
  } as CartItem;
}

function makeStripe(): Stripe {
  return {
    prices: {
      retrieve: vi.fn(async () => ({
        id: PRICE_ID,
        active: true,
        product: 'prod_workshop',
        lookup_key: 'workshop_deep_dive',
      })),
    },
  } as unknown as Stripe;
}

describe('validateWorkshopCartItems — sales cutoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryResult.data = [makeWorkshopRow()];
    mocks.queryResult.error = null;
  });

  it('accepts a published workshop before it starts', async () => {
    const result = await validateWorkshopCartItems({
      items: [makeCartItem()],
      stripe: makeStripe(),
      now: new Date('2026-09-10T06:59:00.000Z'),
    });

    expect(result.valid).toBe(true);
    expect(result.workshopsById?.has(WORKSHOP_ID)).toBe(true);
  });

  it('rejects a workshop whose Zurich start time has passed', async () => {
    const stripe = makeStripe();
    const result = await validateWorkshopCartItems({
      items: [makeCartItem()],
      stripe,
      now: new Date('2026-09-10T07:00:00.000Z'),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Sales for "Deep Dive Workshop" have closed');
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Checkout blocked: workshop has already started',
      expect.objectContaining({ workshopId: WORKSHOP_ID })
    );
    // We bail out before spending a Stripe round-trip.
    expect((stripe.prices.retrieve as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('rejects a workshop later the same day even with seats remaining', async () => {
    const result = await validateWorkshopCartItems({
      items: [makeCartItem()],
      stripe: makeStripe(),
      now: new Date('2026-09-10T15:00:00.000Z'),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already started/);
  });

  it('does not gate a workshop that has no scheduled date', async () => {
    mocks.queryResult.data = [makeWorkshopRow({ date: null, start_time: null, end_time: null })];

    const result = await validateWorkshopCartItems({
      items: [makeCartItem()],
      stripe: makeStripe(),
      now: new Date('2030-01-01T00:00:00.000Z'),
    });

    expect(result.valid).toBe(true);
  });

  it('still rejects unpublished workshops ahead of the cutoff check', async () => {
    mocks.queryResult.data = [makeWorkshopRow({ status: 'draft' })];

    const result = await validateWorkshopCartItems({
      items: [makeCartItem()],
      stripe: makeStripe(),
      now: new Date('2026-09-10T15:00:00.000Z'),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('"Deep Dive Workshop" is no longer available.');
  });
});
