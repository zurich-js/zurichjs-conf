/**
 * Public Bluesky Feed API
 * GET /api/social/bluesky-posts
 *
 * Surfaces Bluesky posts about ZurichJS as social validation on the homepage:
 *   1. Posts FROM @zurichjs.com (via getAuthorFeed)
 *   2. Posts MENTIONING @zurichjs.com (via searchPosts?mentions=)
 *   3. Posts tagged with any configured hashtag (via searchPosts?tag=)
 *
 * Uses an authenticated Bluesky session when `BLUESKY_IDENTIFIER` /
 * `BLUESKY_APP_PASSWORD` are configured (recommended — much higher rate
 * limits). Falls back to the unauthenticated public AppView otherwise.
 *
 * Pass ?_debug=1 to get a per-query breakdown of upstream URL / status /
 * count, plus whether the request was authenticated.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { blueskyConfig } from '@/data/social';
import { isBlueskyAuthenticated, xrpcGet } from '@/lib/bluesky/client';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Feed API');

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
  status: 'ok' | 'error';
  count: number;
  error?: string;
}

export interface BlueskyFeedResponse {
  posts: BlueskyFeedPost[];
  debug?: {
    authenticated: boolean;
    entries: BlueskyFeedDebugEntry[];
  };
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
  run: () => Promise<RawBlueskyPost[]>;
}

function specForAuthorFeed(handle: string): FetchSpec {
  return {
    source: `getAuthorFeed(${handle})`,
    run: async () => {
      const data = await xrpcGet<{ feed?: AuthorFeedItem[] }>({
        method: 'app.bsky.feed.getAuthorFeed',
        params: { actor: handle, limit: AUTHOR_FEED_LIMIT, filter: 'posts_no_replies' },
      });
      // Drop reposts (items carrying a reason) — keep original posts only.
      return (data.feed ?? []).filter((item) => !item.reason).map((item) => item.post);
    },
  };
}

function specForMentions(handle: string): FetchSpec {
  return {
    source: `searchPosts(mentions=${handle})`,
    run: async () => {
      const data = await xrpcGet<{ posts?: RawBlueskyPost[] }>({
        method: 'app.bsky.feed.searchPosts',
        params: { q: handle, mentions: handle, sort: 'latest', limit: SEARCH_LIMIT_PER_TERM },
      });
      return data.posts ?? [];
    },
  };
}

function specForTag(tag: string): FetchSpec {
  return {
    source: `searchPosts(tag=${tag})`,
    run: async () => {
      const data = await xrpcGet<{ posts?: RawBlueskyPost[] }>({
        method: 'app.bsky.feed.searchPosts',
        params: { q: tag, tag, sort: 'latest', limit: SEARCH_LIMIT_PER_TERM },
      });
      return data.posts ?? [];
    },
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
  const authenticated = isBlueskyAuthenticated();

  const specs: FetchSpec[] = [
    specForAuthorFeed(handle),
    specForMentions(handle),
    ...hashtags.map((tag) => specForTag(tag)),
  ];

  try {
    const results = await Promise.allSettled(specs.map((s) => s.run()));

    const seen = new Set<string>();
    const merged: BlueskyFeedPost[] = [];
    const entries: BlueskyFeedDebugEntry[] = [];

    results.forEach((result, idx) => {
      const spec = specs[idx];
      if (result.status === 'rejected') {
        const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        entries.push({ source: spec.source, status: 'error', count: 0, error: errMsg });
        // Only escalate to error-level if the section ends up empty; otherwise
        // partial failures are expected against the public AppView.
        log.warn('Bluesky upstream failed', {
          source: spec.source,
          error: errMsg,
          authenticated,
        });
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
      entries.push({ source: spec.source, status: 'ok', count: added });
    });

    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const posts = merged.slice(0, maxPosts);

    if (debugMode) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ posts, debug: { authenticated, entries } });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ posts });
  } catch (error) {
    log.error('Failed to fetch Bluesky feed', error);
    return res.status(500).json({ error: 'Failed to fetch Bluesky feed' });
  }
}
