/**
 * Public Community Partners API
 * GET /api/partners/community - Get community partners for public display
 *
 * This endpoint does NOT require authentication.
 * Returns only partners with:
 * - type = 'community' or 'company'
 * - status = 'active'
 * - company_logo_url is not null
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublicCommunityPartners } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('Public Community Partners API');
const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const partners = await getPublicCommunityPartners();

    res.setHeader('Cache-Control', CACHE_CONTROL);

    return res.status(200).json({ partners });
  } catch (error) {
    log.error('Error fetching public community partners', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch community partners',
    });
  }
}
