/**
 * Public Speaker Lineup API
 * GET /api/speakers - Returns visible speakers with their accepted sessions
 *
 * This endpoint is public and returns only speakers who:
 * 1. Have is_visible = true
 * 2. Have at least one accepted submission (talk or workshop)
 *
 * Response format:
 * {
 *   speakers: PublicSpeaker[]
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getVisibleSpeakersWithSessions } from '@/lib/cfp/speakers';
import type { PublicSpeaker } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('Speakers API');

interface SpeakersResponse {
  speakers: PublicSpeaker[];
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpeakersResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const speakers = await getVisibleSpeakersWithSessions();

    // Set cache headers for CDN caching (5 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({ speakers });
  } catch (error) {
    log.error('Error fetching speakers', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
