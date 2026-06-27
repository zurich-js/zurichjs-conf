import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

interface QueryResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

const mocks = vi.hoisted(() => {
  const queryResult: QueryResult = { data: [], error: null };
  const terminalQuery = {
    get data() {
      return queryResult.data;
    },
    get error() {
      return queryResult.error;
    },
    eq: vi.fn(() => terminalQuery),
  };
  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    not: vi.fn(() => terminalQuery),
  };

  return {
    buildOfferingSummaries: vi.fn(),
    buildPublicProgramScheduleItems: vi.fn(),
    fetchPublicSpeakers: vi.fn(),
    getPublicScheduleRows: vi.fn(),
    getStripeClient: vi.fn(),
    loggerError: vi.fn(),
    parseCurrencyParam: vi.fn(),
    queryBuilder,
    queryResult,
    supabaseFrom: vi.fn(),
  };
});

vi.mock('@/config/currency', () => ({
  parseCurrencyParam: mocks.parseCurrencyParam,
}));

vi.mock('@/lib/queries/speakers', () => ({
  fetchPublicSpeakers: mocks.fetchPublicSpeakers,
}));

vi.mock('@/lib/program/schedule', () => ({
  buildPublicProgramScheduleItems: mocks.buildPublicProgramScheduleItems,
  getPublicScheduleRows: mocks.getPublicScheduleRows,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mocks.supabaseFrom,
  })),
}));

vi.mock('@/lib/workshops/stripePriceLookup', () => ({
  buildOfferingSummaries: mocks.buildOfferingSummaries,
  getStripeClient: mocks.getStripeClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: mocks.loggerError,
    })),
  },
}));

import handler from '../schedule';

interface MockResponse {
  _status: number;
  _json: unknown;
  _ended: boolean;
  _headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  end: () => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    _ended: false,
    _headers: {},
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
    end() {
      res._ended = true;
      return res;
    },
    setHeader(name, value) {
      res._headers[name] = value;
      return res;
    },
  };
  return res;
}

async function callHandler(req: Partial<NextApiRequest>): Promise<MockResponse> {
  const res = createResponse();
  await handler(req as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

describe('/api/workshops/schedule cache headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseCurrencyParam.mockReturnValue('CHF');
    mocks.fetchPublicSpeakers.mockResolvedValue({ speakers: [] });
    mocks.getPublicScheduleRows.mockResolvedValue([]);
    mocks.buildPublicProgramScheduleItems.mockReturnValue([]);
    mocks.getStripeClient.mockReturnValue({});
    mocks.buildOfferingSummaries.mockResolvedValue([]);
    mocks.queryResult.data = [];
    mocks.queryResult.error = null;
    mocks.supabaseFrom.mockReturnValue(mocks.queryBuilder);
  });

  it('returns cache headers for HEAD requests without loading schedule data', async () => {
    const res = await callHandler({ method: 'HEAD', query: {} });

    expect(res._status).toBe(200);
    expect(res._ended).toBe(true);
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=300, stale-while-revalidate=600');
    expect(mocks.getPublicScheduleRows).not.toHaveBeenCalled();
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
  });

  it('caches successful public schedule responses at the edge', async () => {
    const res = await callHandler({ method: 'GET', query: {} });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      items: [],
      offeringsBySubmissionId: {},
      currency: 'CHF',
    });
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=300, stale-while-revalidate=600');
  });

  it('does not cache failed public schedule responses at the edge', async () => {
    mocks.getPublicScheduleRows.mockRejectedValueOnce(new Error('Schedule lookup failed'));

    const res = await callHandler({ method: 'GET', query: {} });

    expect(res._status).toBe(500);
    expect(res._headers['Cache-Control']).toBe('no-store');
    expect(mocks.loggerError).toHaveBeenCalled();
  });
});
