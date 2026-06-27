/**
 * Public Speaker Lineup API
 * GET /api/speakers - Returns visible speakers with their accepted sessions
 *
 * This endpoint is public and returns only speakers who:
 * 1. Have is_visible = true
 * 2. May have zero or more accepted submissions exposed by the public contract
 *
 * Response format:
 * {
 *   speakers: PublicSpeaker[],
 *   programSpeakerCount: number
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getProgramSpeakerCount, getVisibleSpeakersWithSessions } from '@/lib/cfp/speakers';
import type { PublicSpeaker } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('Speakers API');

interface SpeakersResponse {
  speakers: PublicSpeaker[];
  programSpeakerCount: number;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpeakersResponse | ErrorResponse>
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  try {
    const [visibleSpeakers, programSpeakerCount] = await Promise.all([
      getVisibleSpeakersWithSessions(),
      getProgramSpeakerCount(),
    ]);
    let speakers = visibleSpeakers;

    if (req.query.featured === 'true') {
      speakers = speakers.filter((s) => s.is_featured);
    }

    return res.status(200).json({ speakers, programSpeakerCount });
  } catch (error) {
    log.error('Error fetching speakers', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
