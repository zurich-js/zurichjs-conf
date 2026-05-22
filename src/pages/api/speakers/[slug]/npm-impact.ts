/**
 * Public npm impact endpoint.
 * GET /api/speakers/[slug]/npm-impact
 *
 * Returns the speaker's maintained packages (+ declared contributions) with
 * weekly download counts aggregated from the npm registry. The npm handle is
 * read from `cfp_speakers.npm_username`, set in the admin speaker editor.
 * Data is cached server-side for 6h; this handler additionally sets a 6h CDN
 * cache header with a 24h stale-while-revalidate window.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getSpeakerNpmImpact } from '@/lib/npm';
import type { SpeakerNpmImpact } from '@/lib/npm';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { logger } from '@/lib/logger';

const log = logger.scope('Speaker npm Impact API');

const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

const querySchema = z.object({
  slug: z.string().min(1),
});

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpeakerNpmImpact | ErrorResponse>,
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

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed' });
  }

  const slug = parsed.data.slug.toLowerCase();

  const { speakers } = await fetchPublicSpeakers();
  const speaker = speakers.find((entry) => entry.slug === slug);
  const npmUsername = speaker?.socials.npm_username?.trim() ?? null;

  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  if (!npmUsername) {
    return res.status(404).json({ error: 'Speaker has no npm username configured' });
  }

  try {
    const impact = await getSpeakerNpmImpact({
      speakerSlug: slug,
      npmUsername,
    });

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(impact);
  } catch (error) {
    log.error('Failed to fetch speaker npm impact', error, {
      slug,
      npmUsername,
    });
    return res.status(502).json({ error: 'Failed to fetch npm impact' });
  }
}
