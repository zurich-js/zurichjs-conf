/**
 * Public Bluesky Feed API
 * GET /api/social/bluesky-posts
 *
 * Surfaces Bluesky posts about ZurichJS as social validation on the homepage:
 *   1. Posts FROM @zurichjs.com (via getAuthorFeed)
 *   2. Posts MENTIONING @zurichjs.com (via searchPosts?mentions=)
 *   3. Posts tagged with any configured hashtag (via searchPosts?tag=)
 *
 * Backed by the unauthenticated public AppView (public.api.bsky.app), so no
 * API key or session is required.
 *
 * Pass ?_debug=1 to get a per-query breakdown of what the upstream returned.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { blueskyConfig } from '@/data/social';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Feed API');

const BLUESKY_PUBLIC_APPVIEW = 'https://public.api.bsky.app';
const SEARCH_LIMIT_PER_TERM = 25;
const AUTHOR_FEED_LIMIT = 20;

export interface BlueskyFeedAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BlueskyFeedPost {
  uri: string;
  webUrl: string;
  text: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  author: BlueskyFeedAuthor;
  isFromOfficial: boolean;
}

export interface BlueskyFeedDebugEntry {
  source: string;
  url: string;
  status: 'ok' | 'error';
  count: number;
  error?: string;
}

export interface BlueskyFeedResponse {
  posts: BlueskyFeedPost[];
  debug?: BlueskyFeedDebugEntry[];
}

interface ErrorResponse {
  error: string;
}

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

function atUriToWebUrl(uri: string): string {
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!match) return 'https://bsky.app';
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bluesky ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function buildSearchUrl(params: Record<string, string>): string {
  const url = new URL('/xrpc/app.bsky.feed.searchPosts', BLUESKY_PUBLIC_APPVIEW);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('limit', String(SEARCH_LIMIT_PER_TERM));
  url.searchParams.set('sort', 'latest');
  return url.toString();
}

function buildAuthorFeedUrl(actor: string): string {
  const url = new URL('/xrpc/app.bsky.feed.getAuthorFeed', BLUESKY_PUBLIC_APPVIEW);
  url.searchParams.set('actor', actor);
  url.searchParams.set('limit', String(AUTHOR_FEED_LIMIT));
  url.searchParams.set('filter', 'posts_no_replies');
  return url.toString();
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

interface FetchSpec {
  source: string;
  url: string;
  extract: (data: unknown) => RawBlueskyPost[];
}

function specForAuthorFeed(handle: string): FetchSpec {
  return {
    source: `getAuthorFeed(${handle})`,
    url: buildAuthorFeedUrl(handle),
    extract: (data) => {
      const feed = (data as { feed?: AuthorFeedItem[] }).feed ?? [];
      // Drop reposts (items with a reason) — keep only original posts.
      return feed.filter((item) => !item.reason).map((item) => item.post);
    },
  };
}

function specForMentions(handle: string): FetchSpec {
  return {
    source: `searchPosts(mentions=${handle})`,
    url: buildSearchUrl({ q: handle, mentions: handle }),
    extract: (data) => (data as { posts?: RawBlueskyPost[] }).posts ?? [],
  };
}

function specForTag(tag: string): FetchSpec {
  return {
    source: `searchPosts(tag=${tag})`,
    url: buildSearchUrl({ q: tag, tag }),
    extract: (data) => (data as { posts?: RawBlueskyPost[] }).posts ?? [],
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BlueskyFeedResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { handle, hashtags, maxPosts } = blueskyConfig;
  const debugMode = req.query._debug === '1';

  const specs: FetchSpec[] = [
    specForAuthorFeed(handle),
    specForMentions(handle),
    ...hashtags.map((tag) => specForTag(tag)),
  ];

  try {
    const results = await Promise.allSettled(
      specs.map(async (spec) => {
        const data = await fetchJson<unknown>(spec.url);
        return spec.extract(data);
      })
    );

    const seen = new Set<string>();
    const merged: BlueskyFeedPost[] = [];
    const debug: BlueskyFeedDebugEntry[] = [];

    results.forEach((result, idx) => {
      const spec = specs[idx];
      if (result.status === 'rejected') {
        const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        debug.push({ source: spec.source, url: spec.url, status: 'error', count: 0, error: errMsg });
        log.error('Bluesky upstream failed', result.reason, { source: spec.source });
        return;
      }

      let added = 0;
      for (const raw of result.value) {
        if (seen.has(raw.uri)) continue;
        const normalized = normalize(raw, handle);
        if (!normalized) continue;
        seen.add(raw.uri);
        merged.push(normalized);
        added += 1;
      }
      debug.push({ source: spec.source, url: spec.url, status: 'ok', count: added });
    });

    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const posts = merged.slice(0, maxPosts);

    // 15-min CDN cache, 1-hour SWR — but bypass when debugging.
    if (debugMode) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ posts, debug });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ posts });
  } catch (error) {
    log.error('Failed to fetch Bluesky feed', error);
    return res.status(500).json({ error: 'Failed to fetch Bluesky feed' });
  }
}
