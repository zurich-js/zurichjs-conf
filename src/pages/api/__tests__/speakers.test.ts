import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  getProgramSpeakerCount: vi.fn(),
  getVisibleSpeakersWithSessions: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/lib/cfp/speakers', () => ({
  getProgramSpeakerCount: mocks.getProgramSpeakerCount,
  getVisibleSpeakersWithSessions: mocks.getVisibleSpeakersWithSessions,
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

import handler from '../speakers';

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

describe('/api/speakers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVisibleSpeakersWithSessions.mockResolvedValue([]);
    mocks.getProgramSpeakerCount.mockResolvedValue(0);
  });

  it('returns cache headers for HEAD requests without fetching speakers', async () => {
    const res = await callHandler({ method: 'HEAD', query: {} });

    expect(res._status).toBe(200);
    expect(res._ended).toBe(true);
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=21600, stale-while-revalidate=86400');
    expect(mocks.getVisibleSpeakersWithSessions).not.toHaveBeenCalled();
    expect(mocks.getProgramSpeakerCount).not.toHaveBeenCalled();
  });

  it('caches successful public speaker responses at the edge', async () => {
    const res = await callHandler({ method: 'GET', query: {} });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ speakers: [], programSpeakerCount: 0 });
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=21600, stale-while-revalidate=86400');
  });

  it('does not cache failed public speaker responses at the edge', async () => {
    mocks.getVisibleSpeakersWithSessions.mockRejectedValueOnce(new Error('Speaker lookup failed'));

    const res = await callHandler({ method: 'GET', query: {} });

    expect(res._status).toBe(500);
    expect(res._headers['Cache-Control']).toBe('no-store');
    expect(mocks.loggerError).toHaveBeenCalled();
  });
});
