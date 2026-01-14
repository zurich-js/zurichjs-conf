/**
 * Unit Tests for Ticket Pricing API Handler
 *
 * Tests for all logic in pricing.ts including:
 * - buildLookupKey: Build Stripe lookup key for category/stage/currency
 * - fetchPrice: Fetch price from Stripe by lookup key
 * - Currency fallback: Fall back to CHF when requested currency not available
 * - Stock calculation: Calculate remaining stock for each category
 * - Handler: Main API handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import type Stripe from 'stripe';

// Use vi.hoisted to create mock functions that are hoisted with vi.mock
const mocks = vi.hoisted(() => ({
  mockPricesList: vi.fn(),
  mockGetTicketCounts: vi.fn().mockResolvedValue({
    counts: {
      total: 100,
      byCategory: {
        standard: 50,
        vip: 10,
        student: 5,
        unemployed: 2,
      },
      byStage: {
        blind_bird: 30,
        early_bird: 20,
        general_admission: 10,
        late_bird: 0,
      },
    },
  }),
  mockGetCurrentStage: vi.fn().mockReturnValue({
    stage: 'early_bird',
    displayName: 'Early Bird',
    startDate: new Date(),
    endDate: new Date(),
  }),
  mockGetStockInfo: vi.fn().mockReturnValue({
    remaining: 50,
    total: 100,
    soldOut: false,
  }),
  mockServerAnalyticsError: vi.fn().mockResolvedValue(undefined),
}));

// Mock Stripe - use a class to avoid the vi.fn() warning
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      prices = {
        list: mocks.mockPricesList,
      };
    },
  };
});

// Mock dependencies
vi.mock('@/lib/tickets/getTicketCounts', () => ({
  getTicketCounts: mocks.mockGetTicketCounts,
}));

vi.mock('@/config/pricing-stages', () => ({
  getCurrentStage: mocks.mockGetCurrentStage,
  getStockInfo: mocks.mockGetStockInfo,
  GLOBAL_STOCK_LIMITS: {
    vip: 50,
    standard: 500,
  },
}));

vi.mock('@/config/currency', () => ({
  parseCurrencyParam: vi.fn((param) => {
    if (param === 'EUR') return 'EUR';
    if (param === 'GBP') return 'GBP';
    return 'CHF';
  }),
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    error: mocks.mockServerAnalyticsError,
  },
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

// Import handler after mocks
import handler from '../pricing';

// ============================================================================
// Test Utilities
// ============================================================================

interface MockRequest extends Partial<NextApiRequest> {
  method: string;
  query: Record<string, string | string[] | undefined>;
}

interface MockResponse {
  _status: number;
  _json: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    method: 'GET',
    query: {},
    ...overrides,
  };
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      return res;
    },
  };
  return res;
}

/**
 * Call the handler with mock request/response
 * The handler only uses method, query from request and status, json from response
 */
async function callHandler(req: MockRequest, res: MockResponse): Promise<void> {
  await handler(
    req as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
}

const createMockStripePrice = (
  lookupKey: string,
  unitAmount: number,
  currency: string
): Stripe.Price =>
  ({
    id: `price_${lookupKey}`,
    lookup_key: lookupKey,
    unit_amount: unitAmount,
    currency: currency.toLowerCase(),
    active: true,
  }) as Stripe.Price;

// ============================================================================
// Handler Tests
// ============================================================================

describe('Ticket Pricing API Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

    // Default mock: return CHF prices
    mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
      const key = lookup_keys[0];

      // CHF prices (no suffix)
      if (key === 'standard_student_unemployed') {
        return { data: [createMockStripePrice(key, 5000, 'CHF')] };
      }
      if (key === 'standard_early_bird') {
        return { data: [createMockStripePrice(key, 15000, 'CHF')] };
      }
      if (key === 'vip_early_bird') {
        return { data: [createMockStripePrice(key, 35000, 'CHF')] };
      }
      if (key === 'standard_late_bird') {
        return { data: [createMockStripePrice(key, 25000, 'CHF')] };
      }
      if (key === 'vip_late_bird') {
        return { data: [createMockStripePrice(key, 45000, 'CHF')] };
      }

      // EUR prices
      if (key === 'standard_student_unemployed_eur') {
        return { data: [createMockStripePrice(key, 5000, 'EUR')] };
      }
      if (key === 'standard_early_bird_eur') {
        return { data: [createMockStripePrice(key, 14000, 'EUR')] };
      }
      if (key === 'vip_early_bird_eur') {
        return { data: [createMockStripePrice(key, 32000, 'EUR')] };
      }
      if (key === 'standard_late_bird_eur') {
        return { data: [createMockStripePrice(key, 23000, 'EUR')] };
      }
      if (key === 'vip_late_bird_eur') {
        return { data: [createMockStripePrice(key, 42000, 'EUR')] };
      }

      // GBP prices - not available (for testing fallback)
      if (key.endsWith('_gbp')) {
        return { data: [] };
      }

      return { data: [] };
    });

    mocks.mockGetCurrentStage.mockReturnValue({
      stage: 'early_bird',
      displayName: 'Early Bird',
    });

    mocks.mockGetTicketCounts.mockResolvedValue({
      counts: {
        total: 100,
        byCategory: { standard: 50, vip: 10 },
        byStage: { early_bird: 60 },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Method Validation
  // ==========================================================================

  describe('method validation', () => {
    it('should return 405 for POST requests', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(405);
      expect(res._json).toEqual(
        expect.objectContaining({
          plans: [],
          error: 'Method not allowed',
        })
      );
    });

    it('should return 405 for PUT requests', async () => {
      const req = createMockRequest({ method: 'PUT' });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(405);
    });

    it('should return 405 for DELETE requests', async () => {
      const req = createMockRequest({ method: 'DELETE' });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(405);
    });

    it('should accept GET requests', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(200);
    });
  });

  // ==========================================================================
  // CHF Pricing (Default)
  // ==========================================================================

  describe('CHF pricing (default)', () => {
    it('should return CHF prices when no currency specified', async () => {
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { plans: Array<{ currency: string }> };
      expect(json.plans.length).toBeGreaterThan(0);
      expect(json.plans.every((p) => p.currency === 'CHF')).toBe(true);
    });

    it('should return CHF prices when currency=CHF', async () => {
      const req = createMockRequest({ query: { currency: 'CHF' } });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { plans: Array<{ currency: string }> };
      expect(json.plans.every((p) => p.currency === 'CHF')).toBe(true);
    });

    it('should include all ticket categories', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ id: string }> };
      const categories = json.plans.map((p) => p.id);

      expect(categories).toContain('standard_student_unemployed');
      expect(categories).toContain('standard');
      expect(categories).toContain('vip');
    });

    it('should include correct lookup keys without suffix', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ lookupKey: string }> };
      const lookupKeys = json.plans.map((p) => p.lookupKey);

      expect(lookupKeys).toContain('standard_student_unemployed');
      expect(lookupKeys).toContain('standard_early_bird');
      expect(lookupKeys).toContain('vip_early_bird');
    });
  });

  // ==========================================================================
  // EUR Pricing
  // ==========================================================================

  describe('EUR pricing', () => {
    it('should return EUR prices when currency=EUR', async () => {
      const req = createMockRequest({ query: { currency: 'EUR' } });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { plans: Array<{ currency: string }> };
      expect(json.plans.length).toBeGreaterThan(0);
      expect(json.plans.every((p) => p.currency === 'EUR')).toBe(true);
    });

    it('should include _eur suffix in lookup keys', async () => {
      const req = createMockRequest({ query: { currency: 'EUR' } });
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ lookupKey: string }> };
      const lookupKeys = json.plans.map((p) => p.lookupKey);

      expect(lookupKeys).toContain('standard_student_unemployed_eur');
      expect(lookupKeys).toContain('standard_early_bird_eur');
      expect(lookupKeys).toContain('vip_early_bird_eur');
    });
  });

  // ==========================================================================
  // GBP Pricing with Fallback
  // ==========================================================================

  describe('GBP pricing with fallback', () => {
    it('should fall back to CHF when GBP prices not available', async () => {
      const req = createMockRequest({ query: { currency: 'GBP' } });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { plans: Array<{ currency: string }> };

      // Should have plans (fell back to CHF)
      expect(json.plans.length).toBeGreaterThan(0);
      // Should be CHF prices
      expect(json.plans.every((p) => p.currency === 'CHF')).toBe(true);
    });

    it('should log error when falling back from GBP to CHF', async () => {
      const req = createMockRequest({ query: { currency: 'GBP' } });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(mocks.mockServerAnalyticsError).toHaveBeenCalledWith(
        'pricing-api',
        expect.stringContaining('No pricing plans found for GBP'),
        expect.objectContaining({
          type: 'system',
          severity: 'medium',
          code: 'CURRENCY_FALLBACK',
        })
      );
    });

    it('should include attempted lookup keys in error log', async () => {
      const req = createMockRequest({ query: { currency: 'GBP' } });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(mocks.mockServerAnalyticsError).toHaveBeenCalledWith(
        'pricing-api',
        expect.any(String),
        expect.objectContaining({
          stack: expect.stringContaining('standard_early_bird_gbp'),
        })
      );
    });

    it('should return GBP prices when available', async () => {
      // Mock GBP prices as available
      mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
        const key = lookup_keys[0];
        if (key === 'standard_student_unemployed_gbp') {
          return { data: [createMockStripePrice(key, 4000, 'GBP')] };
        }
        if (key === 'standard_early_bird_gbp') {
          return { data: [createMockStripePrice(key, 12000, 'GBP')] };
        }
        if (key === 'vip_early_bird_gbp') {
          return { data: [createMockStripePrice(key, 28000, 'GBP')] };
        }
        if (key === 'standard_late_bird_gbp') {
          return { data: [createMockStripePrice(key, 20000, 'GBP')] };
        }
        if (key === 'vip_late_bird_gbp') {
          return { data: [createMockStripePrice(key, 38000, 'GBP')] };
        }
        return { data: [] };
      });

      const req = createMockRequest({ query: { currency: 'GBP' } });
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { plans: Array<{ currency: string }> };
      expect(json.plans.length).toBeGreaterThan(0);
      expect(json.plans.every((p) => p.currency === 'GBP')).toBe(true);
      expect(mocks.mockServerAnalyticsError).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Compare Prices
  // ==========================================================================

  describe('compare prices', () => {
    it('should include compare price from late_bird for non-student tickets', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ id: string; comparePrice?: number }> };
      const standardPlan = json.plans.find((p) => p.id === 'standard');
      const vipPlan = json.plans.find((p) => p.id === 'vip');

      expect(standardPlan?.comparePrice).toBe(25000); // late_bird price
      expect(vipPlan?.comparePrice).toBe(45000); // late_bird price
    });

    it('should not include compare price for student/unemployed tickets', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ id: string; comparePrice?: number }> };
      const studentPlan = json.plans.find((p) => p.id === 'standard_student_unemployed');

      expect(studentPlan?.comparePrice).toBeUndefined();
    });

    it('should not include compare price when stage is late_bird', async () => {
      mocks.mockGetCurrentStage.mockReturnValue({
        stage: 'late_bird',
        displayName: 'Late Bird',
      });

      // Update mock to return late_bird prices
      mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
        const key = lookup_keys[0];
        if (key === 'standard_student_unemployed') {
          return { data: [createMockStripePrice(key, 5000, 'CHF')] };
        }
        if (key === 'standard_late_bird') {
          return { data: [createMockStripePrice(key, 25000, 'CHF')] };
        }
        if (key === 'vip_late_bird') {
          return { data: [createMockStripePrice(key, 45000, 'CHF')] };
        }
        return { data: [] };
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ comparePrice?: number }> };
      expect(json.plans.every((p) => p.comparePrice === undefined)).toBe(true);
    });
  });

  // ==========================================================================
  // Stage Information
  // ==========================================================================

  describe('stage information', () => {
    it('should return current stage in response', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { currentStage: string; stageDisplayName: string };
      expect(json.currentStage).toBe('early_bird');
      expect(json.stageDisplayName).toBe('Early Bird');
    });

    it('should use stage in lookup keys for non-student tickets', async () => {
      mocks.mockGetCurrentStage.mockReturnValue({
        stage: 'blind_bird',
        displayName: 'Blind Bird',
      });

      // Update mock to return blind_bird prices
      mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
        const key = lookup_keys[0];
        if (key === 'standard_student_unemployed') {
          return { data: [createMockStripePrice(key, 5000, 'CHF')] };
        }
        if (key === 'standard_blind_bird') {
          return { data: [createMockStripePrice(key, 10000, 'CHF')] };
        }
        if (key === 'vip_blind_bird') {
          return { data: [createMockStripePrice(key, 25000, 'CHF')] };
        }
        if (key === 'standard_late_bird') {
          return { data: [createMockStripePrice(key, 25000, 'CHF')] };
        }
        if (key === 'vip_late_bird') {
          return { data: [createMockStripePrice(key, 45000, 'CHF')] };
        }
        return { data: [] };
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ lookupKey: string }>; currentStage: string };
      const standardPlan = json.plans.find((p) => p.lookupKey === 'standard_blind_bird');

      expect(standardPlan).toBeDefined();
      expect(json.currentStage).toBe('blind_bird');
    });

    it('should always use fixed lookup key for student/unemployed (no stage)', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ id: string; lookupKey: string }> };
      const studentPlan = json.plans.find((p) => p.id === 'standard_student_unemployed');

      expect(studentPlan?.lookupKey).toBe('standard_student_unemployed');
    });
  });

  // ==========================================================================
  // Stock Information
  // ==========================================================================

  describe('stock information', () => {
    it('should include stock info for each plan', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as {
        plans: Array<{ stock: { remaining: number | null; total: number | null; soldOut: boolean } }>;
      };

      expect(json.plans.every((p) => p.stock !== undefined)).toBe(true);
      expect(json.plans.every((p) => typeof p.stock.soldOut === 'boolean')).toBe(true);
    });

    it('should use GLOBAL_STOCK_LIMITS for VIP tickets', async () => {
      mocks.mockGetTicketCounts.mockResolvedValue({
        counts: {
          total: 100,
          byCategory: { vip: 10 },
          byStage: {},
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as {
        plans: Array<{ id: string; stock: { remaining: number; total: number } }>;
      };
      const vipPlan = json.plans.find((p) => p.id === 'vip');

      expect(vipPlan?.stock.total).toBe(50); // GLOBAL_STOCK_LIMITS.vip
      expect(vipPlan?.stock.remaining).toBe(40); // 50 - 10 sold
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should return 500 when getTicketCounts throws error', async () => {
      mocks.mockGetTicketCounts.mockRejectedValue(new Error('Database connection error'));

      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(500);
      const json = res._json as { error: string };
      expect(json.error).toContain('Database connection error');
    });

    it('should return 500 when STRIPE_SECRET_KEY is not set', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      expect(res._status).toBe(500);
      const json = res._json as { error: string };
      expect(json.error).toContain('STRIPE_SECRET_KEY');
    });

    it('should handle missing prices gracefully (fetchPrice catches errors)', async () => {
      // Return empty data for all prices
      mocks.mockPricesList.mockResolvedValue({ data: [] });

      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      // Should still return 200, just with empty plans
      expect(res._status).toBe(200);
      const json = res._json as { plans: unknown[] };
      expect(json.plans).toEqual([]);
    });

    it('should handle Stripe price fetch errors gracefully', async () => {
      // fetchPrice catches errors and returns null, so handler still returns 200
      mocks.mockPricesList.mockRejectedValue(new Error('Stripe API error'));

      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      // Should return 200 with empty plans (errors caught in fetchPrice)
      expect(res._status).toBe(200);
      const json = res._json as { plans: unknown[] };
      expect(json.plans).toEqual([]);
    });
  });

  // ==========================================================================
  // Response Structure
  // ==========================================================================

  describe('response structure', () => {
    it('should return correct plan structure', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<Record<string, unknown>> };
      const plan = json.plans[0];

      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('title');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('currency');
      expect(plan).toHaveProperty('priceId');
      expect(plan).toHaveProperty('lookupKey');
      expect(plan).toHaveProperty('stage');
      expect(plan).toHaveProperty('stock');
    });

    it('should return correct response structure', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as Record<string, unknown>;

      expect(json).toHaveProperty('plans');
      expect(json).toHaveProperty('currentStage');
      expect(json).toHaveProperty('stageDisplayName');
      expect(Array.isArray(json.plans)).toBe(true);
    });

    it('should include correct titles for categories', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await callHandler(req, res);

      const json = res._json as { plans: Array<{ id: string; title: string }> };

      const studentPlan = json.plans.find((p) => p.id === 'standard_student_unemployed');
      const standardPlan = json.plans.find((p) => p.id === 'standard');
      const vipPlan = json.plans.find((p) => p.id === 'vip');

      expect(studentPlan?.title).toBe('Student / Unemployed');
      expect(standardPlan?.title).toBe('Standard');
      expect(vipPlan?.title).toBe('VIP');
    });
  });
});

// ============================================================================
// buildLookupKey Function Tests (via integration)
// ============================================================================

describe('buildLookupKey (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

    mocks.mockGetCurrentStage.mockReturnValue({
      stage: 'early_bird',
      displayName: 'Early Bird',
    });

    mocks.mockGetTicketCounts.mockResolvedValue({
      counts: { total: 0, byCategory: {}, byStage: {} },
    });
  });

  it('should build CHF lookup key without suffix', async () => {
    const calledKeys: string[] = [];
    mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
      calledKeys.push(...lookup_keys);
      return { data: [] };
    });

    const req = createMockRequest({ query: { currency: 'CHF' } });
    const res = createMockResponse();

    await callHandler(req, res);

    expect(calledKeys).toContain('standard_early_bird');
    expect(calledKeys).toContain('vip_early_bird');
    expect(calledKeys).toContain('standard_student_unemployed');
    expect(calledKeys.some((k) => k.endsWith('_chf'))).toBe(false);
  });

  it('should build EUR lookup key with _eur suffix', async () => {
    const calledKeys: string[] = [];
    mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
      calledKeys.push(...lookup_keys);
      return { data: [] };
    });

    const req = createMockRequest({ query: { currency: 'EUR' } });
    const res = createMockResponse();

    await callHandler(req, res);

    expect(calledKeys).toContain('standard_early_bird_eur');
    expect(calledKeys).toContain('vip_early_bird_eur');
    expect(calledKeys).toContain('standard_student_unemployed_eur');
  });

  it('should build GBP lookup key with _gbp suffix', async () => {
    const calledKeys: string[] = [];
    mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
      calledKeys.push(...lookup_keys);
      return { data: [] };
    });

    const req = createMockRequest({ query: { currency: 'GBP' } });
    const res = createMockResponse();

    await callHandler(req, res);

    // First attempt should be GBP keys
    expect(calledKeys).toContain('standard_early_bird_gbp');
    expect(calledKeys).toContain('vip_early_bird_gbp');
    expect(calledKeys).toContain('standard_student_unemployed_gbp');
  });

  it('should use stage in lookup key for standard/vip but not student', async () => {
    mocks.mockGetCurrentStage.mockReturnValue({
      stage: 'blind_bird',
      displayName: 'Blind Bird',
    });

    const calledKeys: string[] = [];
    mocks.mockPricesList.mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) => {
      calledKeys.push(...lookup_keys);
      return { data: [] };
    });

    const req = createMockRequest();
    const res = createMockResponse();

    await callHandler(req, res);

    expect(calledKeys).toContain('standard_blind_bird');
    expect(calledKeys).toContain('vip_blind_bird');
    expect(calledKeys).toContain('standard_student_unemployed'); // No stage
  });
});
