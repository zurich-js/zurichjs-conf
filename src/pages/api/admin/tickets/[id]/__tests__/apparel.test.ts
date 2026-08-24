import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  ticketSingle: vi.fn(),
  preferencesMaybeSingle: vi.fn(),
  upsertSingle: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: mocks.verifyAdminAccess,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'tickets') {
        return {
          select: () => ({ eq: () => ({ single: mocks.ticketSingle }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: mocks.preferencesMaybeSingle }) }),
        upsert: (...args: unknown[]) => {
          mocks.upsert(...args);
          return { select: () => ({ single: mocks.upsertSingle }) };
        },
      };
    },
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

import handler from '../apparel';

interface MockResponse {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    _headers: {},
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
    setHeader(name, value) {
      res._headers[name] = value;
      return res;
    },
  };
  return res;
}

const TICKET_ID = 'a3bb189e-8bf9-4888-9912-ace4e6543002';

async function callHandler(req: Partial<NextApiRequest>) {
  const res = createResponse();
  await handler(
    { query: { id: TICKET_ID }, ...req } as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false, botClient: null });
  mocks.ticketSingle.mockResolvedValue({ data: { id: TICKET_ID }, error: null });
  mocks.preferencesMaybeSingle.mockResolvedValue({
    data: { tshirt_size: 'M', hoodie_size: 'L' },
    error: null,
  });
  mocks.upsertSingle.mockResolvedValue({
    data: { tshirt_size: 'XL', hoodie_size: 'L' },
    error: null,
  });
});

describe('GET /api/admin/tickets/[id]/apparel', () => {
  it('returns the stored sizes', async () => {
    const res = await callHandler({ method: 'GET' });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ tshirtSize: 'M', hoodieSize: 'L' });
  });

  it('returns nulls when no preferences row exists', async () => {
    mocks.preferencesMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await callHandler({ method: 'GET' });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ tshirtSize: null, hoodieSize: null });
  });

  it('rejects unauthenticated requests', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false, isBot: false, botClient: null });

    const res = await callHandler({ method: 'GET' });

    expect(res._status).toBe(401);
  });

  it('404s for an unknown ticket', async () => {
    mocks.ticketSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const res = await callHandler({ method: 'GET' });

    expect(res._status).toBe(404);
  });
});

describe('PATCH /api/admin/tickets/[id]/apparel', () => {
  it('updates the t-shirt size without touching the hoodie size', async () => {
    const res = await callHandler({ method: 'PATCH', body: { tshirtSize: 'XL' } });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ tshirtSize: 'XL', hoodieSize: 'L' });
    expect(mocks.upsert).toHaveBeenCalledWith(
      { ticket_id: TICKET_ID, tshirt_size: 'XL' },
      { onConflict: 'ticket_id' }
    );
  });

  it('allows clearing the t-shirt size', async () => {
    mocks.upsertSingle.mockResolvedValue({
      data: { tshirt_size: null, hoodie_size: 'L' },
      error: null,
    });

    const res = await callHandler({ method: 'PATCH', body: { tshirtSize: null } });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ tshirtSize: null, hoodieSize: 'L' });
  });

  it('rejects an invalid size', async () => {
    const res = await callHandler({ method: 'PATCH', body: { tshirtSize: 'XXXL' } });

    expect(res._status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('returns 500 when the upsert fails', async () => {
    mocks.upsertSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await callHandler({ method: 'PATCH', body: { tshirtSize: 'S' } });

    expect(res._status).toBe(500);
  });
});

describe('unsupported methods', () => {
  it('405s on POST', async () => {
    const res = await callHandler({ method: 'POST', body: {} });

    expect(res._status).toBe(405);
    expect(res._headers.Allow).toBe('GET, PATCH');
  });
});
