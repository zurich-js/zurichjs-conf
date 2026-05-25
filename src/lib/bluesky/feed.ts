import {
  BLUESKY_FEED_CACHE_MAX_AGE_MS,
  BLUESKY_FEED_TIMEOUT_MS,
  blueskyFeedConfig,
  type BlueskyFeedConfig,
} from '@/lib/bluesky/config';
import { isBlueskyAuthenticated, xrpcGet, type XrpcGetParams } from '@/lib/bluesky/client';
import type { BlueskyFeedDebugEntry, BlueskyFeedPost, BlueskyFeedResult } from '@/lib/bluesky/types';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Feed');

const SEARCH_LIMIT_PER_TERM = 25;
const AUTHOR_FEED_LIMIT = 20;

export type BlueskyXrpcGet = <T>(params: XrpcGetParams) => Promise<T>;

interface RawBlueskyPost {
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
    $type?: string;
  };
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
}

interface AuthorFeedItem {
  post: RawBlueskyPost;
  reply?: unknown;
  reason?: { $type?: string };
}

interface FetchSpec {
  source: string;
  run: () => Promise<RawBlueskyPost[]>;
}

export interface FetchFreshBlueskyFeedOptions {
  config?: BlueskyFeedConfig;
  debug?: boolean;
  xrpc?: BlueskyXrpcGet;
  authenticated?: boolean;
}

export interface GetCachedBlueskyFeedOptions extends FetchFreshBlueskyFeedOptions {
  maxAgeMs?: number;
  timeoutMs?: number;
  now?: () => number;
}

interface CachedFeed {
  fetchedAtMs: number;
  result: BlueskyFeedResult;
}

let cachedFeed: CachedFeed | null = null;
let inflightFeed: Promise<BlueskyFeedResult> | null = null;

function atUriToWebUrl(uri: string): string {
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!match) return 'https://bsky.app';
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`;
}

function normalize(post: RawBlueskyPost, officialHandle: string): BlueskyFeedPost | null {
  const text = post.record?.text;
  const createdAt = post.record?.createdAt;
  if (!text || !createdAt) return null;

  return {
    uri: post.uri,
    webUrl: atUriToWebUrl(post.uri),
    text,
    createdAt,
    likeCount: post.likeCount ?? 0,
    replyCount: post.replyCount ?? 0,
    repostCount: post.repostCount ?? 0,
    author: {
      did: post.author.did,
      handle: post.author.handle,
      displayName: post.author.displayName,
      avatar: post.author.avatar,
    },
    isFromOfficial: post.author.handle.toLowerCase() === officialHandle.toLowerCase(),
  };
}

function specForAuthorFeed(handle: string, xrpc: BlueskyXrpcGet): FetchSpec {
  return {
    source: `getAuthorFeed(${handle})`,
    run: async () => {
      const data = await xrpc<{ feed?: AuthorFeedItem[] }>({
        method: 'app.bsky.feed.getAuthorFeed',
        params: { actor: handle, limit: AUTHOR_FEED_LIMIT, filter: 'posts_no_replies' },
      });
      return (data.feed ?? []).filter((item) => !item.reason).map((item) => item.post);
    },
  };
}

function specForMentions(handle: string, xrpc: BlueskyXrpcGet): FetchSpec {
  return {
    source: `searchPosts(mentions=${handle})`,
    run: async () => {
      const data = await xrpc<{ posts?: RawBlueskyPost[] }>({
        method: 'app.bsky.feed.searchPosts',
        params: { q: handle, mentions: handle, sort: 'latest', limit: SEARCH_LIMIT_PER_TERM },
      });
      return data.posts ?? [];
    },
  };
}

function specForTag(tag: string, xrpc: BlueskyXrpcGet): FetchSpec {
  return {
    source: `searchPosts(tag=${tag})`,
    run: async () => {
      const data = await xrpc<{ posts?: RawBlueskyPost[] }>({
        method: 'app.bsky.feed.searchPosts',
        params: { q: tag, tag, sort: 'latest', limit: SEARCH_LIMIT_PER_TERM },
      });
      return data.posts ?? [];
    },
  };
}

export async function fetchFreshBlueskyFeed({
  config = blueskyFeedConfig,
  debug = false,
  xrpc = xrpcGet,
  authenticated = isBlueskyAuthenticated(),
}: FetchFreshBlueskyFeedOptions = {}): Promise<BlueskyFeedResult> {
  const specs: FetchSpec[] = [
    specForAuthorFeed(config.handle, xrpc),
    specForMentions(config.handle, xrpc),
    ...config.hashtags.map((tag) => specForTag(tag, xrpc)),
  ];

  const results = await Promise.allSettled(specs.map((spec) => spec.run()));

  const seen = new Set<string>();
  const merged: BlueskyFeedPost[] = [];
  const entries: BlueskyFeedDebugEntry[] = [];

  results.forEach((result, idx) => {
    const spec = specs[idx];
    if (!spec) return;

    if (result.status === 'rejected') {
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
      entries.push({ source: spec.source, status: 'error', count: 0, error });
      log.warn('Bluesky upstream failed', {
        source: spec.source,
        error,
        authenticated,
      });
      return;
    }

    let added = 0;
    for (const rawPost of result.value) {
      if (seen.has(rawPost.uri)) continue;
      const post = normalize(rawPost, config.handle);
      if (!post) continue;
      seen.add(rawPost.uri);
      merged.push(post);
      added += 1;
    }
    entries.push({ source: spec.source, status: 'ok', count: added });
  });

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const posts = merged.slice(0, config.maxPosts);

  return {
    posts,
    ...(debug ? { debug: { authenticated, entries } } : {}),
  };
}

function timeoutResult(ms: number): Promise<BlueskyFeedResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ posts: [] }), ms);
  });
}

function startRefresh(options: FetchFreshBlueskyFeedOptions, now: () => number): Promise<BlueskyFeedResult> {
  if (inflightFeed) return inflightFeed;

  inflightFeed = fetchFreshBlueskyFeed(options)
    .then((result) => {
      cachedFeed = {
        fetchedAtMs: now(),
        result: { posts: result.posts },
      };
      return cachedFeed.result;
    })
    .catch((error) => {
      log.error('Failed to refresh Bluesky feed', error);
      return cachedFeed?.result ?? { posts: [] };
    })
    .finally(() => {
      inflightFeed = null;
    });

  return inflightFeed;
}

export async function getCachedBlueskyFeed({
  maxAgeMs = BLUESKY_FEED_CACHE_MAX_AGE_MS,
  timeoutMs = BLUESKY_FEED_TIMEOUT_MS,
  now = Date.now,
  ...fetchOptions
}: GetCachedBlueskyFeedOptions = {}): Promise<BlueskyFeedResult> {
  const nowMs = now();
  if (cachedFeed && nowMs - cachedFeed.fetchedAtMs <= maxAgeMs) {
    return cachedFeed.result;
  }

  const refresh = startRefresh(fetchOptions, now);
  if (cachedFeed) {
    void refresh;
    return cachedFeed.result;
  }

  return Promise.race([refresh, timeoutResult(timeoutMs)]);
}

export function resetBlueskyFeedCacheForTests(): void {
  cachedFeed = null;
  inflightFeed = null;
}
