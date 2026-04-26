/**
 * Admin Travel Speaker Update API
 * PUT /api/admin/cfp/travel/speakers/[id] - Update admin travel planning fields for a speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { updateSpeakerTravelAdmin } from '@/lib/cfp/admin-travel';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Speaker Update API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Speaker ID is required' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      attending_speakers_dinner,
      attending_after_party,
      attending_post_conf,
      travel_confirmed,
    } = req.body ?? {};

    const { success, error } = await updateSpeakerTravelAdmin(id, {
      attending_speakers_dinner,
      attending_after_party,
      attending_post_conf,
      travel_confirmed,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    log.info('Speaker travel updated', { speakerId: id });
    return res.status(200).json({ success });
  } catch (error) {
    log.error('Error updating speaker travel', error, { speakerId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
