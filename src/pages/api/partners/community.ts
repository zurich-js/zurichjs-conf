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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const partners = await getPublicCommunityPartners();

    // Set cache headers for performance (cache for 5 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({ partners });
  } catch (error) {
    log.error('Error fetching public community partners', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch community partners',
    });
  }
}
