import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  getColleagueCount: vi.fn(),
}));

vi.mock('@/lib/team-detection', () => ({
  isValidDomain: vi.fn((d: string) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)),
  getColleagueCount: mocks.getColleagueCount,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
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

import handler from '../colleagues';

interface MockResponse {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  setHeader: (key: string, value: string) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    setHeader(key, value) { res._headers[key] = value; return res; },
  };
  return res;
}

function createRequest(method: string, query?: Record<string, string>): NextApiRequest {
  return { method, query: query ?? {} } as unknown as NextApiRequest;
}

describe('GET /api/team/colleagues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getColleagueCount.mockResolvedValue({ count: 0, companyName: null });
  });

  it('rejects non-GET methods', async () => {
    const res = createResponse();
    await handler(createRequest('POST'), res as unknown as NextApiResponse);
    expect(res._status).toBe(405);
  });

  it('validates domain parameter', async () => {
    const res = createResponse();
    await handler(createRequest('GET', { domain: 'ab' }), res as unknown as NextApiResponse);
    expect(res._status).toBe(400);
  });

  it('rejects invalid domain format', async () => {
    const res = createResponse();
    await handler(createRequest('GET', { domain: "sql'; DROP TABLE--" }), res as unknown as NextApiResponse);
    expect(res._status).toBe(400);
  });

  it('returns colleague count for valid domain', async () => {
    mocks.getColleagueCount.mockResolvedValue({ count: 5, companyName: 'Acme Corp' });
    const res = createResponse();
    await handler(createRequest('GET', { domain: 'acme.com' }), res as unknown as NextApiResponse);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ count: 5, companyName: 'Acme Corp' });
  });

  it('sets cache-control header', async () => {
    const res = createResponse();
    await handler(createRequest('GET', { domain: 'acme.com' }), res as unknown as NextApiResponse);
    expect(res._headers['Cache-Control']).toBe('private, max-age=300');
  });

  it('returns zero count when no colleagues found', async () => {
    mocks.getColleagueCount.mockResolvedValue({ count: 0, companyName: null });
    const res = createResponse();
    await handler(createRequest('GET', { domain: 'new-company.com' }), res as unknown as NextApiResponse);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ count: 0, companyName: null });
  });

  it('passes exclude email to getColleagueCount', async () => {
    const res = createResponse();
    await handler(
      createRequest('GET', { domain: 'acme.com', exclude: 'me@acme.com' }),
      res as unknown as NextApiResponse
    );
    expect(mocks.getColleagueCount).toHaveBeenCalledWith(
      expect.anything(),
      'acme.com',
      'me@acme.com'
    );
  });
});
