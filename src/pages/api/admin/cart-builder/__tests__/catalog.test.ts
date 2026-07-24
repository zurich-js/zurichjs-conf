/**
 * Unit tests for the Admin Cart Builder Catalog API handler.
 *
 * Covers:
 * - Admin auth gating (401 without cookie/API key)
 * - Method gating (405 for non-GET)
 * - Catalog shape: tickets (including sold-out ones) + workshops with titles
 * - Currency-suffixed Stripe lookup keys
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  mockVerifyAdminAccess: vi.fn(),
  mockPricesList: vi.fn(),
  mockGetTicketCounts: vi.fn(),
  mockGetCurrentStage: vi.fn(),
  mockBuildOfferingSummaries: vi.fn(),
  mockWorkshopsQueryResult: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: mocks.mockVerifyAdminAccess,
}));

vi.mock('@/lib/tickets/getTicketCounts', () => ({
  getTicketCounts: mocks.mockGetTicketCounts,
}));

vi.mock('@/config/pricing-stages', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/pricing-stages')>();
  return {
    ...actual,
    getCurrentStage: mocks.mockGetCurrentStage,
  };
});

vi.mock('@/lib/workshops/stripePriceLookup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workshops/stripePriceLookup')>();
  return {
    ...actual,
    getStripeClient: vi.fn(() => ({ prices: { list: mocks.mockPricesList } })),
    buildOfferingSummaries: mocks.mockBuildOfferingSummaries,
  };
});

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => mocks.mockWorkshopsQueryResult()),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

import handler from '../catalog';
import type { CartBuilderCatalogResponse } from '../catalog';

interface MockResponse {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
  status: (code: number) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    _headers: {},
    status(code: number) {
      res._status = code;
      return res;
    },
    setHeader(name: string, value: string) {
      res._headers[name] = value;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      return res;
    },
  };
  return res;
}

async function callHandler(
  method: string,
  query: Record<string, string> = {}
): Promise<MockResponse> {
  const res = createMockResponse();
  await handler(
    { method, query, cookies: {}, headers: {} } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

const mockPrice = (lookupKey: string, unitAmount: number, currency: string) => ({
  id: `price_${lookupKey}`,
  lookup_key: lookupKey,
  unit_amount: unitAmount,
  currency: currency.toLowerCase(),
  active: true,
});

// VIP sold out: 30 of 30 sold.
const SOLD_OUT_VIP_COUNTS = {
  byStage: { blind_bird: 30, early_bird: 20, standard: 10, late_bird: 0 },
  byCategory: { standard_student_unemployed: 5, standard: 25, vip: 30 },
};

describe('Admin Cart Builder Catalog API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: false, botClient: null });
    mocks.mockGetTicketCounts.mockResolvedValue({ success: true, counts: SOLD_OUT_VIP_COUNTS });
    mocks.mockGetCurrentStage.mockReturnValue({
      stage: 'standard',
      displayName: 'General Admission',
      startDate: new Date('2026-04-22T00:00:00.000Z'),
      endDate: new Date('2026-08-01T00:00:00.000Z'),
      priority: 3,
      description: 'Regular pricing',
    });
    mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => ({
      data: lookup_keys.map((key, index) => mockPrice(key, 10000 + index * 5000, key.endsWith('_eur') ? 'EUR' : 'CHF')),
    }));
    mocks.mockWorkshopsQueryResult.mockResolvedValue({
      data: [
        {
          id: 'ws-1',
          title: 'Advanced TypeScript',
          status: 'published',
          stripe_price_lookup_key: 'workshop_advanced_ts',
          capacity: 20,
          enrolled_count: 20,
        },
      ],
      error: null,
    });
    mocks.mockBuildOfferingSummaries.mockResolvedValue([
      {
        workshopId: 'ws-1',
        sessionId: null,
        cfpSubmissionId: null,
        slug: 'advanced_ts',
        lookupKey: 'workshop_advanced_ts',
        priceId: 'price_workshop_advanced_ts',
        stripeProductId: 'prod_ws1',
        unitAmount: 25000,
        currency: 'CHF',
        capacity: 20,
        enrolledCount: 20,
        capacityRemaining: 0,
        soldOut: true,
        room: 'Room A',
        durationMinutes: 180,
      },
    ]);
  });

  it('returns 401 when not authorized as admin', async () => {
    mocks.mockVerifyAdminAccess.mockReturnValue({ authorized: false, isBot: false, botClient: null });

    const res = await callHandler('GET');

    expect(res._status).toBe(401);
    expect((res._json as CartBuilderCatalogResponse).error).toBe('Unauthorized');
    expect(mocks.mockGetTicketCounts).not.toHaveBeenCalled();
  });

  it('returns 405 for non-GET methods', async () => {
    const res = await callHandler('POST');

    expect(res._status).toBe(405);
    expect((res._json as CartBuilderCatalogResponse).error).toBe('Method not allowed');
  });

  it('returns tickets including sold-out categories with stock info', async () => {
    const res = await callHandler('GET');

    expect(res._status).toBe(200);
    const body = res._json as CartBuilderCatalogResponse;
    expect(body.currency).toBe('CHF');
    expect(body.currentStage).toBe('standard');
    expect(body.stageDisplayName).toBe('General Admission');

    const vip = body.tickets.find((t) => t.id === 'vip');
    expect(vip).toBeDefined();
    expect(vip?.stock.soldOut).toBe(true);
    expect(vip?.priceId).toBe('price_vip_standard');

    const standard = body.tickets.find((t) => t.id === 'standard');
    expect(standard?.stock.soldOut).toBe(false);

    // Admin responses must not be cached.
    expect(res._headers['Cache-Control']).toBe('no-store');
  });

  it('returns published workshops with titles, including sold-out ones', async () => {
    const res = await callHandler('GET');

    const body = res._json as CartBuilderCatalogResponse;
    expect(body.workshops).toHaveLength(1);
    expect(body.workshops[0]).toMatchObject({
      workshopId: 'ws-1',
      title: 'Advanced TypeScript',
      price: 25000,
      priceId: 'price_workshop_advanced_ts',
      soldOut: true,
      capacityRemaining: 0,
      room: 'Room A',
      durationMinutes: 180,
    });
  });

  it('requests currency-suffixed lookup keys for non-CHF currencies', async () => {
    await callHandler('GET', { currency: 'EUR' });

    expect(mocks.mockPricesList).toHaveBeenCalledWith(
      expect.objectContaining({
        lookup_keys: [
          'standard_student_unemployed_eur',
          'standard_standard_eur',
          'vip_standard_eur',
        ],
      })
    );
    expect(mocks.mockBuildOfferingSummaries).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'EUR'
    );
  });
});
