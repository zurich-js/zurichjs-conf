/**
 * Public Bluesky feed API.
 *
 * Homepage and blog render server-fed posts first, then use this route for
 * cursor-based client pagination.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  BLUESKY_FEED_LOAD_MORE_PAGE_SIZE,
  BLUESKY_FEED_TIMEOUT_MS,
  InvalidBlueskyFeedCursorError,
  fetchFreshBlueskyFeed,
  getCachedBlueskyFeed,
} from '@/lib/bluesky';
import type { BlueskyFeedResult } from '@/lib/bluesky';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Feed API');

interface ErrorResponse {
  error: string;
  issues?: z.core.$ZodIssue[];
}

const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 120,
});

const querySchema = z.object({
  _debug: z.union([z.literal('1'), z.array(z.literal('1')).max(1)]).optional(),
  cursor: z.union([z.string().min(1), z.array(z.string().min(1)).max(1)]).optional(),
  limit: z.union([z.string().regex(/^\d+$/), z.array(z.string().regex(/^\d+$/)).max(1)]).optional(),
});

function isDebugQuery(debug: z.infer<typeof querySchema>['_debug']): boolean {
  return debug === '1' || (Array.isArray(debug) && debug[0] === '1');
}

function getSingleQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getRequestedLimit(limit: z.infer<typeof querySchema>['limit']): number {
  const value = getSingleQueryValue(limit);
  if (!value) return BLUESKY_FEED_LOAD_MORE_PAGE_SIZE;
  return Number(value);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BlueskyFeedResult | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const rateLimit = rateLimiter.check(ip);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return res.status(429).json({ error: 'Too many requests' });
  }

  const parsedQuery = querySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parsedQuery.error.issues,
    });
  }

  const debugMode = isDebugQuery(parsedQuery.data._debug);
  const cursor = getSingleQueryValue(parsedQuery.data.cursor);
  const limit = getRequestedLimit(parsedQuery.data.limit);

  try {
    if (cursor) {
      const result = await fetchFreshBlueskyFeed({ cursor, limit, debug: debugMode });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    }

    if (debugMode) {
      const result = await fetchFreshBlueskyFeed({ debug: true });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    }

    const result = await getCachedBlueskyFeed({ timeoutMs: BLUESKY_FEED_TIMEOUT_MS });
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof InvalidBlueskyFeedCursorError) {
      return res.status(400).json({ error: 'Invalid cursor' });
    }
    log.error('Failed to fetch Bluesky feed', error);
    return res.status(502).json({ error: 'Failed to fetch Bluesky feed' });
  }
}
