import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { BlueskyFeedPost } from '@/lib/bluesky/types';

const mocks = vi.hoisted(() => ({
  fetchFreshBlueskyFeed: vi.fn(),
  getCachedBlueskyFeed: vi.fn(),
  InvalidBlueskyFeedCursorError: class InvalidBlueskyFeedCursorError extends Error {
    constructor() {
      super('Invalid Bluesky feed cursor');
      this.name = 'InvalidBlueskyFeedCursorError';
    }
  },
  rateLimitCheck: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/lib/bluesky', () => ({
  BLUESKY_FEED_LOAD_MORE_PAGE_SIZE: 10,
  BLUESKY_FEED_TIMEOUT_MS: 3000,
  InvalidBlueskyFeedCursorError: mocks.InvalidBlueskyFeedCursorError,
  fetchFreshBlueskyFeed: mocks.fetchFreshBlueskyFeed,
  getCachedBlueskyFeed: mocks.getCachedBlueskyFeed,
}));

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: mocks.rateLimitCheck,
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
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

import handler from '../bluesky-posts';

interface MockResponse {
  _status: number;
  _json: unknown;
  _headers: Record<string, string | number>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  setHeader: (name: string, value: string | number) => MockResponse;
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

async function callHandler(req: Partial<NextApiRequest>): Promise<MockResponse> {
  const res = createResponse();
  await handler(req as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

const post = {
  uri: 'at://did:plc:ada/app.bsky.feed.post/abc',
  webUrl: 'https://bsky.app/profile/did:plc:ada/post/abc',
  text: 'ZurichJS',
  createdAt: '2026-05-01T10:00:00.000Z',
  likeCount: 1,
  replyCount: 2,
  repostCount: 3,
  author: {
    did: 'did:plc:ada',
    handle: 'ada.test',
  },
  isFromOfficial: false,
} satisfies BlueskyFeedPost;

describe('/api/social/bluesky-posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitCheck.mockReturnValue({
      allowed: true,
      remaining: 119,
      resetAt: Date.now() + 60_000,
      current: 1,
    });
    mocks.getCachedBlueskyFeed.mockResolvedValue({ posts: [post] });
    mocks.fetchFreshBlueskyFeed.mockResolvedValue({
      posts: [post],
      debug: { authenticated: false, entries: [] },
    });
  });

  it('rejects unsupported methods', async () => {
    const res = await callHandler({ method: 'POST', query: {} });

    expect(res._status).toBe(405);
    expect(res._json).toEqual({ error: 'Method not allowed' });
    expect(mocks.getCachedBlueskyFeed).not.toHaveBeenCalled();
  });

  it('validates debug query values', async () => {
    const res = await callHandler({ method: 'GET', query: { _debug: '0' } });

    expect(res._status).toBe(400);
    expect(res._json).toEqual(expect.objectContaining({ error: 'Validation failed' }));
  });

  it('returns cached non-debug feed responses with CDN cache headers', async () => {
    const res = await callHandler({ method: 'GET', query: {} });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ posts: [post] });
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=900, stale-while-revalidate=3600');
    expect(mocks.getCachedBlueskyFeed).toHaveBeenCalledWith({ timeoutMs: 3000 });
    expect(mocks.fetchFreshBlueskyFeed).not.toHaveBeenCalled();
  });

  it('returns fresh debug responses without cache', async () => {
    const res = await callHandler({ method: 'GET', query: { _debug: '1' } });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      posts: [post],
      debug: { authenticated: false, entries: [] },
    });
    expect(res._headers['Cache-Control']).toBe('no-store');
    expect(mocks.fetchFreshBlueskyFeed).toHaveBeenCalledWith({ debug: true });
    expect(mocks.getCachedBlueskyFeed).not.toHaveBeenCalled();
  });

  it('returns paginated cursor responses without cache', async () => {
    const res = await callHandler({ method: 'GET', query: { cursor: 'cursor-1' } });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      posts: [post],
      debug: { authenticated: false, entries: [] },
    });
    expect(res._headers['Cache-Control']).toBe('no-store');
    expect(mocks.fetchFreshBlueskyFeed).toHaveBeenCalledWith({
      cursor: 'cursor-1',
      limit: 10,
      debug: false,
    });
    expect(mocks.getCachedBlueskyFeed).not.toHaveBeenCalled();
  });

  it('validates cursor pagination limits', async () => {
    const res = await callHandler({ method: 'GET', query: { cursor: 'cursor-1', limit: 'ten' } });

    expect(res._status).toBe(400);
    expect(res._json).toEqual(expect.objectContaining({ error: 'Validation failed' }));
    expect(mocks.fetchFreshBlueskyFeed).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid cursor payloads', async () => {
    mocks.fetchFreshBlueskyFeed.mockRejectedValueOnce(new mocks.InvalidBlueskyFeedCursorError());

    const res = await callHandler({ method: 'GET', query: { cursor: 'bad-cursor' } });

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: 'Invalid cursor' });
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });
});
