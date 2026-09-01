import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { loadBadgeSources } from '@/lib/badges/data';
import { loadPublicBadgeSpeakers } from '@/lib/badges/speakers';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Admin Badge Provisioning API');

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || isBot) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const sources = await loadBadgeSources(
      createServiceRoleClient(),
      await loadPublicBadgeSpeakers(),
      true
    );
    res.status(200).json({
      counts: {
        attendees: sources.attendees.length,
        speakers: sources.speakers.length,
        sponsors: sources.sponsors.length,
        manual: sources.manual.length,
      },
    });
  } catch (error) {
    log.error('Failed to provision badge identifiers', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to provision badge identifiers',
    });
  }
}
