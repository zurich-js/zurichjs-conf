/**
 * Public Bluesky Feed API
 * GET /api/social/bluesky-posts
 *
 * Surfaces Bluesky posts mentioning the ZurichJS handle or the configured
 * conference hashtags, deduplicated and sorted newest-first. Used by the
 * homepage "what people are saying" section for social validation.
 *
 * Backed by the unauthenticated public AppView (public.api.bsky.app), so no
 * API key or session is required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { blueskyConfig } from '@/data/social';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Feed API');

const BLUESKY_PUBLIC_APPVIEW = 'https://public.api.bsky.app';
const SEARCH_LIMIT_PER_TERM = 25;

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

export interface BlueskyFeedResponse {
  posts: BlueskyFeedPost[];
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

function atUriToWebUrl(uri: string): string {
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!match) return 'https://bsky.app';
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`;
}

async function searchPosts(query: string): Promise<RawBlueskyPost[]> {
  const url = new URL('/xrpc/app.bsky.feed.searchPosts', BLUESKY_PUBLIC_APPVIEW);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(SEARCH_LIMIT_PER_TERM));
  url.searchParams.set('sort', 'latest');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Bluesky search failed (${res.status}) for query "${query}"`);
  }

  const data = (await res.json()) as { posts?: RawBlueskyPost[] };
  return data.posts ?? [];
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BlueskyFeedResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { handle, hashtags, maxPosts } = blueskyConfig;

  // One search per term: posts from the official account, posts mentioning it,
  // and posts using each configured hashtag. The public AppView doesn't accept
  // boolean OR queries, so we fan out and merge.
  const queries = [
    `from:${handle}`,
    `@${handle}`,
    ...hashtags.map((tag) => `#${tag}`),
  ];

  try {
    const results = await Promise.allSettled(queries.map((q) => searchPosts(q)));

    const seen = new Set<string>();
    const merged: BlueskyFeedPost[] = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const raw of result.value) {
        if (seen.has(raw.uri)) continue;
        const normalized = normalize(raw, handle);
        if (!normalized) continue;
        seen.add(raw.uri);
        merged.push(normalized);
      }
    }

    // Newest first, then trim to the configured cap.
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const posts = merged.slice(0, maxPosts);

    // 15-min CDN cache, 1-hour stale-while-revalidate — generous because the
    // feed changes slowly and the public AppView is rate-limited.
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');

    return res.status(200).json({ posts });
  } catch (error) {
    log.error('Failed to fetch Bluesky feed', error, { queries });
    return res.status(500).json({ error: 'Failed to fetch Bluesky feed' });
  }
}
