import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlueskyXrpcGet } from '@/lib/bluesky/feed';
import type { XrpcGetParams } from '@/lib/bluesky/client';

const mocks = vi.hoisted(() => ({
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: mocks.loggerWarn,
      error: mocks.loggerError,
    })),
  },
}));

import { fetchFreshBlueskyFeed, resetBlueskyFeedCacheForTests } from '@/lib/bluesky/feed';

interface TestRawPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text?: string;
    createdAt?: string;
  };
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
}

function rawPost(uri: string, createdAt: string, handle = 'community.test'): TestRawPost {
  return {
    uri,
    cid: `cid-${uri}`,
    author: {
      did: `did:plc:${handle}`,
      handle,
      displayName: handle === 'zurichjs.com' ? 'ZurichJS' : 'Community Member',
      avatar: `https://example.com/${handle}.jpg`,
    },
    record: {
      text: `Post from ${handle} at ${createdAt}`,
      createdAt,
    },
    likeCount: 3,
    replyCount: 2,
    repostCount: 1,
  };
}

function createXrpc(resolver: (params: XrpcGetParams) => unknown): BlueskyXrpcGet {
  return async <T>(params: XrpcGetParams): Promise<T> => resolver(params) as T;
}

describe('Bluesky feed helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBlueskyFeedCacheForTests();
  });

  it('merges sources, dedupes posts, sorts newest first, and caps results', async () => {
    const official = rawPost(
      'at://did:plc:zurich/app.bsky.feed.post/official',
      '2026-05-01T10:00:00.000Z',
      'zurichjs.com'
    );
    const newest = rawPost(
      'at://did:plc:ada/app.bsky.feed.post/newest',
      '2026-05-03T10:00:00.000Z'
    );
    const middle = rawPost(
      'at://did:plc:linus/app.bsky.feed.post/middle',
      '2026-05-02T10:00:00.000Z'
    );
    const repost = rawPost(
      'at://did:plc:zurich/app.bsky.feed.post/repost',
      '2026-05-04T10:00:00.000Z',
      'zurichjs.com'
    );
    const invalid = {
      ...rawPost('at://did:plc:invalid/app.bsky.feed.post/no-text', '2026-05-05T10:00:00.000Z'),
      record: { createdAt: '2026-05-05T10:00:00.000Z' },
    };

    const xrpc = createXrpc(({ method, params }) => {
      if (method === 'app.bsky.feed.getAuthorFeed') {
        expect(params.actor).toBe('zurichjs.com');
        return { feed: [{ post: official }, { post: repost, reason: { $type: 'app.bsky.feed.defs#reasonRepost' } }] };
      }
      if (params.mentions === 'zurichjs.com') {
        return { posts: [newest, official, invalid] };
      }
      return { posts: [middle] };
    });

    const result = await fetchFreshBlueskyFeed({
      xrpc,
      authenticated: false,
      config: {
        handle: 'zurichjs.com',
        hashtags: ['zurichjs'],
        maxPosts: 2,
      },
    });

    expect(result.posts.map((post) => post.uri)).toEqual([newest.uri, middle.uri]);
    expect(result.posts).toHaveLength(2);
    expect(result.posts.some((post) => post.uri === official.uri)).toBe(false);
  });

  it('returns the next page from buffered posts and upstream cursors', async () => {
    const newest = rawPost(
      'at://did:plc:ada/app.bsky.feed.post/newest',
      '2026-05-04T10:00:00.000Z'
    );
    const middle = rawPost(
      'at://did:plc:linus/app.bsky.feed.post/middle',
      '2026-05-03T10:00:00.000Z'
    );
    const buffered = rawPost(
      'at://did:plc:zurich/app.bsky.feed.post/buffered',
      '2026-05-02T10:00:00.000Z',
      'zurichjs.com'
    );
    const older = rawPost(
      'at://did:plc:zurich/app.bsky.feed.post/older',
      '2026-05-01T10:00:00.000Z',
      'zurichjs.com'
    );
    const calls: XrpcGetParams[] = [];

    const xrpc = createXrpc((params) => {
      calls.push(params);
      if (params.method === 'app.bsky.feed.getAuthorFeed' && params.params.cursor === 'author-page-2') {
        return { feed: [{ post: older }] };
      }
      if (params.method === 'app.bsky.feed.getAuthorFeed') {
        return { feed: [{ post: buffered }], cursor: 'author-page-2' };
      }
      if (params.params.mentions === 'zurichjs.com') {
        return { posts: [newest] };
      }
      return { posts: [middle] };
    });

    const firstPage = await fetchFreshBlueskyFeed({
      xrpc,
      authenticated: false,
      limit: 2,
      config: {
        handle: 'zurichjs.com',
        hashtags: ['zurichjs'],
        maxPosts: 8,
      },
    });

    expect(firstPage.posts.map((post) => post.uri)).toEqual([newest.uri, middle.uri]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await fetchFreshBlueskyFeed({
      xrpc,
      authenticated: false,
      cursor: firstPage.nextCursor,
      limit: 2,
      config: {
        handle: 'zurichjs.com',
        hashtags: ['zurichjs'],
        maxPosts: 8,
      },
    });

    expect(secondPage.posts.map((post) => post.uri)).toEqual([buffered.uri, older.uri]);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'app.bsky.feed.getAuthorFeed',
          params: expect.objectContaining({ cursor: 'author-page-2' }),
        }),
      ])
    );
  });

  it('returns partial results and debug entries when one upstream source fails', async () => {
    const official = rawPost(
      'at://did:plc:zurich/app.bsky.feed.post/official',
      '2026-05-01T10:00:00.000Z',
      'zurichjs.com'
    );

    const xrpc = createXrpc(({ method, params }) => {
      if (method === 'app.bsky.feed.getAuthorFeed') return { feed: [{ post: official }] };
      if (params.mentions === 'zurichjs.com') return { posts: [] };
      throw new Error('tag search failed');
    });

    const result = await fetchFreshBlueskyFeed({
      xrpc,
      authenticated: true,
      debug: true,
      config: {
        handle: 'zurichjs.com',
        hashtags: ['zurichjs'],
        maxPosts: 8,
      },
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]?.isFromOfficial).toBe(true);
    expect(result.debug?.authenticated).toBe(true);
    expect(result.debug?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'searchPosts(tag=zurichjs)', status: 'error', error: 'tag search failed' }),
      ])
    );
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });

  it('returns an empty feed when all upstream sources fail', async () => {
    const xrpc = createXrpc(() => {
      throw new Error('upstream unavailable');
    });

    const result = await fetchFreshBlueskyFeed({
      xrpc,
      debug: true,
      config: {
        handle: 'zurichjs.com',
        hashtags: ['zurichjs', 'zurichjsconf'],
        maxPosts: 8,
      },
    });

    expect(result.posts).toEqual([]);
    expect(result.debug?.entries.every((entry) => entry.status === 'error')).toBe(true);
  });
});
