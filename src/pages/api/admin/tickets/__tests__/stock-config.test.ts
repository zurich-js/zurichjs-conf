/**
 * Unit tests for the Ticket Stock Config admin API handler.
 *
 * Covers admin auth gating, method gating, Zod validation of the limits, and
 * the live-availability payload the dashboard renders.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  mockVerifyAdminAccess: vi.fn(),
  mockGetRow: vi.fn(),
  mockUpdateRow: vi.fn(),
  mockGetTicketCounts: vi.fn(),
  mockGetCurrentStage: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: mocks.mockVerifyAdminAccess,
}));

vi.mock('@/lib/tickets/stock-config', () => ({
  getTicketStockConfigRow: mocks.mockGetRow,
  updateTicketStockConfigRow: mocks.mockUpdateRow,
}));

vi.mock('@/lib/tickets/getTicketCounts', () => ({
  getTicketCounts: mocks.mockGetTicketCounts,
}));

vi.mock('@/config/pricing-stages', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/pricing-stages')>();
  return { ...actual, getCurrentStage: mocks.mockGetCurrentStage };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import handler from '../stock-config';
import type { TicketStockConfigResponse } from '../stock-config';

const CONFIG_ROW = {
  id: 'cfg_1',
  singleton: true,
  vip_limit: 52,
  student_unemployed_limit: 35,
  standard_limit: 300,
  updated_at: '2026-09-01T00:00:00.000Z',
};

const COUNTS = {
  byStage: { blind_bird: 0, early_bird: 60, standard: 0, late_bird: 0, last_minute: 0 },
  byCategory: { standard_student_unemployed: 20, standard: 100, vip: 12 },
};

interface MockResponse {
  _status: number;
  _json: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

async function callHandler(method: string, body?: unknown): Promise<MockResponse> {
  const res = createMockResponse();
  await handler(
    { method, body, query: {}, cookies: {}, headers: {} } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: false, botClient: null });
  mocks.mockGetRow.mockResolvedValue(CONFIG_ROW);
  mocks.mockUpdateRow.mockImplementation(async (updates: Record<string, unknown>) => ({
    ...CONFIG_ROW,
    ...updates,
  }));
  mocks.mockGetTicketCounts.mockResolvedValue({ success: true, counts: COUNTS });
  mocks.mockGetCurrentStage.mockReturnValue({ stage: 'early_bird', displayName: 'Early Bird' });
});

describe('Ticket Stock Config API', () => {
  it('returns 401 without admin access', async () => {
    mocks.mockVerifyAdminAccess.mockReturnValue({ authorized: false });

    const res = await callHandler('GET');

    expect(res._status).toBe(401);
    expect(mocks.mockGetRow).not.toHaveBeenCalled();
  });

  it('returns 405 for unsupported methods', async () => {
    const res = await callHandler('DELETE');
    expect(res._status).toBe(405);
  });

  describe('GET', () => {
    it('returns the config alongside live sold counts and remaining stock', async () => {
      const res = await callHandler('GET');
      const body = res._json as TicketStockConfigResponse;

      expect(res._status).toBe(200);
      expect(body.config).toEqual(CONFIG_ROW);
      expect(body.countsAvailable).toBe(true);
      // 12 VIP + 20 student + 100 standard
      expect(body.totalSold).toBe(132);

      const vip = body.categories.find((c) => c.category === 'vip');
      expect(vip).toMatchObject({ sold: 12, stock: { remaining: 40, total: 52, soldOut: false } });

      // Standard is bounded by the total cap, so all 132 confirmed tickets count
      const standard = body.categories.find((c) => c.category === 'standard');
      expect(standard).toMatchObject({
        sold: 100,
        stock: { remaining: 168, total: 300, soldOut: false },
      });
    });

    it('flags unavailable counts and reports full availability instead of a sell-out', async () => {
      mocks.mockGetTicketCounts.mockResolvedValue({ success: false, error: 'db down' });

      const body = (await callHandler('GET'))._json as TicketStockConfigResponse;

      expect(body.countsAvailable).toBe(false);
      expect(body.totalSold).toBe(0);
      expect(body.categories.every((c) => c.stock.soldOut === false)).toBe(true);
    });

    it('reports standard as uncapped when no total cap is set', async () => {
      mocks.mockGetRow.mockResolvedValue({ ...CONFIG_ROW, standard_limit: null });

      const body = (await callHandler('GET'))._json as TicketStockConfigResponse;
      const standard = body.categories.find((c) => c.category === 'standard');

      expect(standard?.stock).toEqual({ remaining: null, total: null, soldOut: false });
    });

    it('returns 500 when the config row is missing', async () => {
      mocks.mockGetRow.mockRejectedValue(new Error('Ticket stock config not found'));

      const res = await callHandler('GET');

      expect(res._status).toBe(500);
    });
  });

  describe('PUT', () => {
    it('persists the submitted limits and returns recomputed availability', async () => {
      const res = await callHandler('PUT', { vip_limit: 60, standard_limit: 400 });
      const body = res._json as TicketStockConfigResponse;

      expect(res._status).toBe(200);
      expect(mocks.mockUpdateRow).toHaveBeenCalledWith({ vip_limit: 60, standard_limit: 400 });
      expect(body.config.vip_limit).toBe(60);
      expect(body.categories.find((c) => c.category === 'standard')?.stock).toEqual({
        remaining: 268,
        total: 400,
        soldOut: false,
      });
    });

    it('accepts a null standard_limit to turn the total cap off', async () => {
      const res = await callHandler('PUT', { standard_limit: null });

      expect(res._status).toBe(200);
      expect(mocks.mockUpdateRow).toHaveBeenCalledWith({ standard_limit: null });
    });

    it('rejects negative limits', async () => {
      const res = await callHandler('PUT', { vip_limit: -1 });

      expect(res._status).toBe(400);
      expect(mocks.mockUpdateRow).not.toHaveBeenCalled();
    });

    it('rejects non-integer limits', async () => {
      const res = await callHandler('PUT', { student_unemployed_limit: 12.5 });

      expect(res._status).toBe(400);
      expect(mocks.mockUpdateRow).not.toHaveBeenCalled();
    });

    it('allows a limit below what is already sold, and reports the sell-out', async () => {
      // Reducing capacity is a legitimate organiser action; it must not 400.
      const res = await callHandler('PUT', { vip_limit: 5 });
      const body = res._json as TicketStockConfigResponse;

      expect(res._status).toBe(200);
      expect(body.categories.find((c) => c.category === 'vip')?.stock).toEqual({
        remaining: 0,
        total: 5,
        soldOut: true,
      });
    });
  });
});
