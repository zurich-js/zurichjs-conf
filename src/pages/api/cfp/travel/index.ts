/**
 * Speaker Travel API
 * GET /api/cfp/travel - Get travel details
 * PUT /api/cfp/travel - Update travel details
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSpeakerTravel, upsertSpeakerTravel } from '@/lib/cfp/travel';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Travel API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get session
  const supabase = createSupabaseApiClient(req, res);
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get speaker
  const speaker = await getSpeakerByUserId(session.user.id);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  if (req.method === 'GET') {
    try {
      const travel = await getSpeakerTravel(speaker.id);
      return res.status(200).json({ travel });
    } catch (error) {
      log.error('Failed to get travel details', error, { speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        arrival_date,
        departure_date,
        attending_speakers_dinner,
        attending_speakers_activities,
        dietary_restrictions,
        accessibility_needs,
      } = req.body;

      const { travel, error } = await upsertSpeakerTravel(speaker.id, {
        arrival_date,
        departure_date,
        attending_speakers_dinner,
        attending_speakers_activities,
        dietary_restrictions,
        accessibility_needs,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Travel details updated', { speakerId: speaker.id });
      return res.status(200).json({ travel });
    } catch (error) {
      log.error('Failed to update travel details', error, { speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
