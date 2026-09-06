import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  verificationsData: { data: [] as unknown[] | null, error: null as unknown },
  ticketsData: { data: [] as unknown[] | null, error: null as unknown },
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: mocks.verifyAdminAccess,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'verification_requests') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve(mocks.verificationsData)),
          })),
        };
      }
      if (table === 'tickets') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve(mocks.ticketsData)),
          })),
        };
      }
      return {};
    }),
  })),
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

import handler from '../index';

interface MockResponse {
  _status: number;
  _json: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createResponse(): MockResponse {
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

async function callHandler(req: Partial<NextApiRequest>) {
  const res = createResponse();
  await handler(req as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

function createVerification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ver-1',
    verification_id: 'VER-001',
    name: 'Test User',
    email: 'test@example.com',
    verification_type: 'student',
    status: 'approved',
    created_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function createTicket(overrides: Record<string, unknown> = {}) {
  return {
    email: 'test@example.com',
    metadata: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true });
  mocks.verificationsData = { data: [], error: null };
  mocks.ticketsData = { data: [], error: null };
});

describe('GET /api/admin/verifications', () => {
  it('rejects non-GET methods', async () => {
    const res = await callHandler({ method: 'POST' });
    expect(res._status).toBe(405);
  });

  it('rejects unauthorized requests', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false });
    const res = await callHandler({ method: 'GET', query: {} });
    expect(res._status).toBe(401);
  });

  it('returns empty results with zeroed stats when no verifications exist', async () => {
    const res = await callHandler({ method: 'GET', query: {} });
    expect(res._status).toBe(200);
    const json = res._json as { verifications: unknown[]; stats: Record<string, number>; ticketLookupFailed: boolean };
    expect(json.verifications).toEqual([]);
    expect(json.stats).toEqual({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      purchased: 0,
      approvedNotPurchased: 0,
    });
    expect(json.ticketLookupFailed).toBe(false);
  });

  describe('email matching', () => {
    it('matches emails case-insensitively (mixed case in verification)', async () => {
      mocks.verificationsData = {
        data: [createVerification({ email: 'John.Doe@UNI.ch' })],
        error: null,
      };
      mocks.ticketsData = {
        data: [createTicket({ email: 'john.doe@uni.ch' })],
        error: null,
      };

      const res = await callHandler({ method: 'GET', query: {} });
      expect(res._status).toBe(200);
      const json = res._json as { verifications: Array<{ has_purchased_ticket: boolean | null }> };
      expect(json.verifications[0].has_purchased_ticket).toBe(true);
    });

    it('matches emails case-insensitively (mixed case in ticket)', async () => {
      mocks.verificationsData = {
        data: [createVerification({ email: 'john.doe@uni.ch' })],
        error: null,
      };
      mocks.ticketsData = {
        data: [createTicket({ email: 'JOHN.DOE@UNI.CH' })],
        error: null,
      };

      const res = await callHandler({ method: 'GET', query: {} });
      expect(res._status).toBe(200);
      const json = res._json as { verifications: Array<{ has_purchased_ticket: boolean | null }> };
      expect(json.verifications[0].has_purchased_ticket).toBe(true);
    });

    it('returns false when email does not match', async () => {
      mocks.verificationsData = {
        data: [createVerification({ email: 'alice@example.com' })],
        error: null,
      };
      mocks.ticketsData = {
        data: [createTicket({ email: 'bob@example.com' })],
        error: null,
      };

      const res = await callHandler({ method: 'GET', query: {} });
      expect(res._status).toBe(200);
      const json = res._json as { verifications: Array<{ has_purchased_ticket: boolean | null }> };
      expect(json.verifications[0].has_purchased_ticket).toBe(false);
    });
  });

  describe('verification_id matching', () => {
    it('matches by verification_id in ticket metadata even when emails differ', async () => {
      mocks.verificationsData = {
        data: [createVerification({ id: 'ver-123', email: 'verified@uni.ch' })],
        error: null,
      };
      mocks.ticketsData = {
        data: [createTicket({ email: 'different@checkout.com', metadata: { verification_id: 'ver-123' } })],
        error: null,
      };

      const res = await callHandler({ method: 'GET', query: {} });
      expect(res._status).toBe(200);
      const json = res._json as { verifications: Array<{ has_purchased_ticket: boolean | null }> };
      expect(json.verifications[0].has_purchased_ticket).toBe(true);
    });

    it('matches by email when verification_id is not present in ticket metadata', async () => {
      mocks.verificationsData = {
        data: [createVerification({ id: 'ver-123', email: 'user@example.com' })],
        error: null,
      };
      mocks.ticketsData = {
        data: [createTicket({ email: 'user@example.com', metadata: null })],
        error: null,
      };

      const res = await callHandler({ method: 'GET', query: {} });
      expect(res._status).toBe(200);
      const json = res._json as { verifications: Array<{ has_purchased_ticket: boolean | null }> };
      expect(json.verifications[0].has_purchased_ticket).toBe(true);
    });
  });

  describe('ticket lookup failure handling', () => {
    it('sets ticketLookupFailed to true when ticket query fails', async () => {
      mocks.verificationsData = {
        data: [createVerification()],
        error: null,
      };
      mocks.ticketsData = {
        data: null,
        error: { message: 'Database error' },
      };

      const res = await callHandler({ method: 'GET', query: {} });
      expect(res._status).toBe(200);
      const json = res._json as { ticketLookupFailed: boolean; verifications: Array<{ has_purchased_ticket: boolean | null }> };
      expect(json.ticketLookupFailed).toBe(true);
    });

    it('sets has_purchased_ticket to null when ticket lookup fails', async () => {
      mocks.verificationsData = {
        data: [createVerification()],
        error: null,
      };
      mocks.ticketsData = {
        data: null,
        error: { message: 'Database error' },
      };

      const res = await callHandler({ method: 'GET', query: {} });
      const json = res._json as { verifications: Array<{ has_purchased_ticket: boolean | null }> };
      expect(json.verifications[0].has_purchased_ticket).toBeNull();
    });

    it('sets purchased stats to 0 when ticket lookup fails', async () => {
      mocks.verificationsData = {
        data: [
          createVerification({ id: 'ver-1', status: 'approved' }),
          createVerification({ id: 'ver-2', status: 'pending' }),
        ],
        error: null,
      };
      mocks.ticketsData = {
        data: null,
        error: { message: 'Database error' },
      };

      const res = await callHandler({ method: 'GET', query: {} });
      const json = res._json as { stats: Record<string, number> };
      expect(json.stats.purchased).toBe(0);
      expect(json.stats.approvedNotPurchased).toBe(0);
    });
  });

  describe('global stats computation', () => {
    it('computes stats from all verifications, not the filtered subset', async () => {
      mocks.verificationsData = {
        data: [
          createVerification({ id: 'ver-1', status: 'pending', email: 'a@test.com' }),
          createVerification({ id: 'ver-2', status: 'approved', email: 'b@test.com' }),
          createVerification({ id: 'ver-3', status: 'approved', email: 'c@test.com' }),
          createVerification({ id: 'ver-4', status: 'rejected', email: 'd@test.com' }),
        ],
        error: null,
      };
      mocks.ticketsData = {
        data: [createTicket({ email: 'b@test.com' })],
        error: null,
      };

      const res = await callHandler({ method: 'GET', query: {} });
      const json = res._json as { stats: Record<string, number> };
      expect(json.stats.total).toBe(4);
      expect(json.stats.pending).toBe(1);
      expect(json.stats.approved).toBe(2);
      expect(json.stats.rejected).toBe(1);
      expect(json.stats.purchased).toBe(1);
      expect(json.stats.approvedNotPurchased).toBe(1);
    });

    it('counts approvedNotPurchased correctly', async () => {
      mocks.verificationsData = {
        data: [
          createVerification({ id: 'ver-1', status: 'approved', email: 'purchased@test.com' }),
          createVerification({ id: 'ver-2', status: 'approved', email: 'notpurchased@test.com' }),
          createVerification({ id: 'ver-3', status: 'pending', email: 'pending@test.com' }),
        ],
        error: null,
      };
      mocks.ticketsData = {
        data: [createTicket({ email: 'purchased@test.com' })],
        error: null,
      };

      const res = await callHandler({ method: 'GET', query: {} });
      const json = res._json as { stats: Record<string, number> };
      expect(json.stats.approvedNotPurchased).toBe(1);
    });
  });
});
