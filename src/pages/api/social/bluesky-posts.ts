/**
 * Public Bluesky feed API.
 *
 * Kept for debug/manual use. Homepage and blog render server-fed posts and do
 * not fetch this route from the browser on initial render.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { fetchFreshBlueskyFeed, getCachedBlueskyFeed } from '@/lib/bluesky';
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
});

function isDebugQuery(debug: z.infer<typeof querySchema>['_debug']): boolean {
  return debug === '1' || (Array.isArray(debug) && debug[0] === '1');
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

  try {
    if (debugMode) {
      const result = await fetchFreshBlueskyFeed({ debug: true });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    }

    const result = await getCachedBlueskyFeed({ timeoutMs: 1000 });
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (error) {
    log.error('Failed to fetch Bluesky feed', error);
    return res.status(502).json({ error: 'Failed to fetch Bluesky feed' });
  }
}
