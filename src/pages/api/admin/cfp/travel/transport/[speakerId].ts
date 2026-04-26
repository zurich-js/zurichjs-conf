/**
 * Admin Transportation API
 * PUT /api/admin/cfp/travel/transport/[speakerId] - Upsert inbound/outbound transport legs for a speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { upsertSpeakerTransportLegsAdmin } from '@/lib/cfp/admin-travel';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Transportation API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { speakerId } = req.query;
  if (!speakerId || typeof speakerId !== 'string') {
    return res.status(400).json({ error: 'Speaker ID is required' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const legs = Array.isArray(req.body?.legs) ? req.body.legs : [];
    const { success, error } = await upsertSpeakerTransportLegsAdmin(speakerId, legs);

    if (error) {
      return res.status(400).json({ error });
    }

    log.info('Transportation updated', { speakerId, legs: legs.length });
    return res.status(200).json({ success });
  } catch (error) {
    log.error('Failed to update transportation', error, { speakerId });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
