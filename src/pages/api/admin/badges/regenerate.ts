import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { loadBadgeSources, regenerateAllBadgeCodes } from '@/lib/badges/data';
import { loadPublicBadgeSpeakers } from '@/lib/badges/speakers';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Admin Badge QR Regeneration API');
const requestSchema = z.object({
  confirmInvalidateExisting: z.literal(true),
}).strict();

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

  const result = requestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    return;
  }

  try {
    const client = createServiceRoleClient();
    await loadBadgeSources(client, await loadPublicBadgeSpeakers(), true);
    const regenerated = await regenerateAllBadgeCodes(client);
    res.status(200).json({ regenerated });
  } catch (error) {
    log.error('Failed to regenerate all badge QR codes', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to regenerate badge QR codes',
    });
  }
}
