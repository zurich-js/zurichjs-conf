/** Public JSON counterpart of /share/[id], using the same public projection. */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { isValidNetworkingPublicId, resolvePublicNetworkingProfile } from '@/lib/networking/profiles';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const log = logger.scope('Public Share API');
const idSchema = z.string().refine(isValidNetworkingPublicId, 'Invalid networking profile ID');
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Contact visibility can change at any time; do not retain public responses.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = idSchema.safeParse(req.query.id);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid networking profile ID', issues: result.error.issues });
    return;
  }

  const rateLimit = rateLimiter.check(getClientIp(req));
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  try {
    const profile = await resolvePublicNetworkingProfile(result.data);
    if (!profile) {
      res.status(404).json({ error: 'Networking profile not found' });
      return;
    }
    res.status(200).json(profile);
  } catch (error) {
    log.error('Failed to resolve public share', error, { publicId: result.data });
    res.status(500).json({ error: 'Failed to fetch networking profile' });
  }
}
