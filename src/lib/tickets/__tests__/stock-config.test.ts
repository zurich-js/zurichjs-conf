import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  single: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { GLOBAL_STOCK_LIMITS } from '@/config/pricing-stages';
import { getTicketStockLimits, invalidateTicketStockLimitsCache } from '../stock-config';

const row = {
  id: 'cfg_1',
  singleton: true,
  vip_limit: 40,
  student_unemployed_limit: 20,
  standard_limit: 250,
  updated_at: '2026-09-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  invalidateTicketStockLimitsCache();
  mocks.createServiceRoleClient.mockReturnValue({
    from: () => ({
      select: () => ({ limit: () => ({ single: mocks.single }) }),
    }),
  });
});

describe('getTicketStockLimits', () => {
  it('maps the config row onto the limit shape getStockInfo expects', async () => {
    mocks.single.mockResolvedValue({ data: row, error: null });

    await expect(getTicketStockLimits()).resolves.toEqual({
      vip: 40,
      student_unemployed: 20,
      standard_total: 250,
    });
  });

  it('carries a null standard_limit through as "uncapped"', async () => {
    mocks.single.mockResolvedValue({ data: { ...row, standard_limit: null }, error: null });

    await expect(getTicketStockLimits()).resolves.toMatchObject({ standard_total: null });
  });

  it('falls back to the constants when the row cannot be read', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(getTicketStockLimits()).resolves.toEqual(GLOBAL_STOCK_LIMITS);
  });

  it('falls back to the constants when the query throws', async () => {
    mocks.single.mockRejectedValue(new Error('connection refused'));

    await expect(getTicketStockLimits()).resolves.toEqual(GLOBAL_STOCK_LIMITS);
  });

  it('caches the resolved limits instead of querying per request', async () => {
    mocks.single.mockResolvedValue({ data: row, error: null });

    await getTicketStockLimits();
    await getTicketStockLimits();

    expect(mocks.single).toHaveBeenCalledTimes(1);
  });

  it('re-queries after the cache is invalidated', async () => {
    mocks.single.mockResolvedValue({ data: row, error: null });
    await getTicketStockLimits();

    invalidateTicketStockLimitsCache();
    mocks.single.mockResolvedValue({ data: { ...row, vip_limit: 99 }, error: null });

    await expect(getTicketStockLimits()).resolves.toMatchObject({ vip: 99 });
    expect(mocks.single).toHaveBeenCalledTimes(2);
  });
});
