import { deflateRawSync, inflateRawSync } from 'node:zlib';
import {
  BLUESKY_FEED_CACHE_MAX_AGE_MS,
  BLUESKY_FEED_TIMEOUT_MS,
  blueskyFeedConfig,
  type BlueskyFeedConfig,
} from '@/lib/bluesky/config';
import { isBlueskyAuthenticated, xrpcGet, type XrpcGetParams } from '@/lib/bluesky/client';
import type {
  BlueskyFeedDebugEntry,
  BlueskyFeedPost,
  BlueskyFeedResult,
} from '@/lib/bluesky/types';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Feed');

const SEARCH_LIMIT_PER_TERM = 25;
const AUTHOR_FEED_LIMIT = 20;
const MAX_FEED_PAGE_SIZE = 25;
const MAX_FETCH_ROUNDS = 4;
const FEED_CURSOR_VERSION = 1;
const MAX_CURSOR_SEEN_URIS = 250;

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

interface FetchPage {
  posts: RawBlueskyPost[];
  cursor?: string;
}

interface FetchSpec {
  key: string;
  source: string;
  run: (cursor?: string) => Promise<FetchPage>;
}

interface FeedCursorPayload {
  v: typeof FEED_CURSOR_VERSION;
  sources: Record<string, string | null>;
  buffer: BlueskyFeedPost[];
  seen: string[];
}

interface FeedCursorState {
  sources: Record<string, string | null | undefined>;
  buffer: BlueskyFeedPost[];
  seen: string[];
}

export interface FetchFreshBlueskyFeedOptions {
  config?: BlueskyFeedConfig;
  debug?: boolean;
  xrpc?: BlueskyXrpcGet;
  authenticated?: boolean;
  cursor?: string;
  limit?: number;
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

export class InvalidBlueskyFeedCursorError extends Error {
  constructor() {
    super('Invalid Bluesky feed cursor');
    this.name = 'InvalidBlueskyFeedCursorError';
  }
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
    key: `author:${handle}`,
    source: `getAuthorFeed(${handle})`,
    run: async (cursor) => {
      const data = await xrpc<{ feed?: AuthorFeedItem[]; cursor?: string }>({
        method: 'app.bsky.feed.getAuthorFeed',
        params: {
          actor: handle,
          limit: AUTHOR_FEED_LIMIT,
          filter: 'posts_no_replies',
          cursor,
        },
      });
      return {
        posts: (data.feed ?? []).filter((item) => !item.reason).map((item) => item.post),
        cursor: data.cursor,
      };
    },
  };
}

function specForMentions(handle: string, xrpc: BlueskyXrpcGet): FetchSpec {
  return {
    key: `mentions:${handle}`,
    source: `searchPosts(mentions=${handle})`,
    run: async (cursor) => {
      const data = await xrpc<{ posts?: RawBlueskyPost[]; cursor?: string }>({
        method: 'app.bsky.feed.searchPosts',
        params: {
          q: handle,
          mentions: handle,
          sort: 'latest',
          limit: SEARCH_LIMIT_PER_TERM,
          cursor,
        },
      });
      return { posts: data.posts ?? [], cursor: data.cursor };
    },
  };
}

function specForTag(tag: string, xrpc: BlueskyXrpcGet): FetchSpec {
  return {
    key: `tag:${tag}`,
    source: `searchPosts(tag=${tag})`,
    run: async (cursor) => {
      const data = await xrpc<{ posts?: RawBlueskyPost[]; cursor?: string }>({
        method: 'app.bsky.feed.searchPosts',
        params: {
          q: tag,
          tag,
          sort: 'latest',
          limit: SEARCH_LIMIT_PER_TERM,
          cursor,
        },
      });
      return { posts: data.posts ?? [], cursor: data.cursor };
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCursorSources(value: unknown): value is Record<string, string | null> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string' || entry === null);
}

function isFeedAuthor(value: unknown): value is BlueskyFeedPost['author'] {
  if (!isRecord(value)) return false;
  const displayName = value.displayName;
  const avatar = value.avatar;
  return (
    typeof value.did === 'string' &&
    typeof value.handle === 'string' &&
    (displayName === undefined || typeof displayName === 'string') &&
    (avatar === undefined || typeof avatar === 'string')
  );
}

function isFeedPost(value: unknown): value is BlueskyFeedPost {
  if (!isRecord(value)) return false;
  return (
    typeof value.uri === 'string' &&
    typeof value.webUrl === 'string' &&
    typeof value.text === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.likeCount === 'number' &&
    typeof value.replyCount === 'number' &&
    typeof value.repostCount === 'number' &&
    isFeedAuthor(value.author) &&
    typeof value.isFromOfficial === 'boolean'
  );
}

function isFeedCursorPayload(value: unknown): value is FeedCursorPayload {
  if (!isRecord(value)) return false;
  return (
    value.v === FEED_CURSOR_VERSION &&
    isCursorSources(value.sources) &&
    Array.isArray(value.buffer) &&
    value.buffer.every(isFeedPost) &&
    Array.isArray(value.seen) &&
    value.seen.every((uri) => typeof uri === 'string')
  );
}

function decodeFeedCursor(cursor?: string): FeedCursorState {
  if (!cursor) {
    return { sources: {}, buffer: [], seen: [] };
  }

  try {
    const inflated = inflateRawSync(Buffer.from(cursor, 'base64url')).toString('utf8');
    const parsed = JSON.parse(inflated) as unknown;
    if (!isFeedCursorPayload(parsed)) {
      throw new InvalidBlueskyFeedCursorError();
    }
    return {
      sources: parsed.sources,
      buffer: parsed.buffer,
      seen: parsed.seen,
    };
  } catch (error) {
    if (error instanceof InvalidBlueskyFeedCursorError) {
      throw error;
    }
    throw new InvalidBlueskyFeedCursorError();
  }
}

function encodeFeedCursor(state: FeedCursorState, specs: FetchSpec[]): string | undefined {
  const sources: Record<string, string | null> = {};
  let hasActiveSource = false;

  for (const spec of specs) {
    const cursor = state.sources[spec.key];
    if (cursor !== undefined) {
      sources[spec.key] = cursor;
    }
    if (cursor !== null) {
      hasActiveSource = true;
    }
  }

  if (state.buffer.length === 0 && !hasActiveSource) {
    return undefined;
  }

  const payload: FeedCursorPayload = {
    v: FEED_CURSOR_VERSION,
    sources,
    buffer: state.buffer,
    seen: state.seen.slice(-MAX_CURSOR_SEEN_URIS),
  };
  const compressed = deflateRawSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  return Buffer.from(compressed).toString('base64url');
}

function normalizeLimit(limit: number | undefined, fallback: number): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return Math.min(fallback, MAX_FEED_PAGE_SIZE);
  }
  return Math.max(1, Math.min(Math.floor(limit), MAX_FEED_PAGE_SIZE));
}

function addCandidate(
  post: BlueskyFeedPost,
  candidates: BlueskyFeedPost[],
  candidateUris: Set<string>,
  seenUris: Set<string>
): boolean {
  if (seenUris.has(post.uri) || candidateUris.has(post.uri)) {
    return false;
  }
  candidateUris.add(post.uri);
  candidates.push(post);
  return true;
}

export async function fetchFreshBlueskyFeed({
  config = blueskyFeedConfig,
  debug = false,
  xrpc = xrpcGet,
  authenticated = isBlueskyAuthenticated(),
  cursor,
  limit,
}: FetchFreshBlueskyFeedOptions = {}): Promise<BlueskyFeedResult> {
  const pageLimit = normalizeLimit(limit, config.maxPosts);
  const specs: FetchSpec[] = [
    specForAuthorFeed(config.handle, xrpc),
    specForMentions(config.handle, xrpc),
    ...config.hashtags.map((tag) => specForTag(tag, xrpc)),
  ];

  const cursorState = decodeFeedCursor(cursor);
  const seenUris = new Set(cursorState.seen);
  const candidateUris = new Set<string>();
  const candidates: BlueskyFeedPost[] = [];
  const entries: BlueskyFeedDebugEntry[] = [];

  for (const bufferedPost of cursorState.buffer) {
    addCandidate(bufferedPost, candidates, candidateUris, seenUris);
  }

  let rounds = 0;
  while (candidates.length < pageLimit && rounds < MAX_FETCH_ROUNDS) {
    const activeSpecs = specs.filter((spec) => cursorState.sources[spec.key] !== null);
    if (activeSpecs.length === 0) break;

    const results = await Promise.allSettled(
      activeSpecs.map((spec) => spec.run(cursorState.sources[spec.key] ?? undefined))
    );

    results.forEach((result, idx) => {
      const spec = activeSpecs[idx];
      if (!spec) return;

      if (result.status === 'rejected') {
        const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
        cursorState.sources[spec.key] = null;
        entries.push({ source: spec.source, status: 'error', count: 0, error });
        log.warn('Bluesky upstream failed', {
          source: spec.source,
          error,
          authenticated,
        });
        return;
      }

      cursorState.sources[spec.key] = result.value.cursor ?? null;

      let added = 0;
      for (const rawPost of result.value.posts) {
        const post = normalize(rawPost, config.handle);
        if (!post) continue;
        if (addCandidate(post, candidates, candidateUris, seenUris)) {
          added += 1;
        }
      }
      entries.push({ source: spec.source, status: 'ok', count: added });
    });

    rounds += 1;
  }

  candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const posts = candidates.slice(0, pageLimit);
  const nextState: FeedCursorState = {
    sources: cursorState.sources,
    buffer: candidates.slice(pageLimit),
    seen: [...cursorState.seen, ...posts.map((post) => post.uri)].slice(-MAX_CURSOR_SEEN_URIS),
  };
  const nextCursor = encodeFeedCursor(nextState, specs);

  return {
    posts,
    ...(nextCursor ? { nextCursor } : {}),
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
        result: {
          posts: result.posts,
          ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        },
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
