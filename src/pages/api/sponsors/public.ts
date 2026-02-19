/**
 * Public Sponsors API
 * GET /api/sponsors/public - Get sponsors for public display on homepage
 *
 * This endpoint does NOT require authentication.
 * Returns only sponsors with:
 * - is_logo_public = true
 * - logo_url is not null
 * - logo_url_color is not null
 * - At least one deal in 'paid' status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublicSponsors } from '@/lib/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Public Sponsors API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sponsors = await getPublicSponsors();

    // Set cache headers for performance (cache for 5 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({ sponsors });
  } catch (error) {
    log.error('Error fetching public sponsors', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch sponsors',
    });
  }
}
