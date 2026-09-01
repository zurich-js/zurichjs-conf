import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { loadBadgeSources } from '@/lib/badges/data';
import { buildBadgeExportFiles } from '@/lib/badges/files';
import type { SpeakerBadgeSource } from '@/lib/badges/export';
import { createZip } from '@/lib/badges/zip';
import { getVisibleSpeakersForOg } from '@/lib/cfp/speakers';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';
import { getBaseUrl } from '@/lib/url';

const log = logger.scope('Admin Badge Export API');
const requestSchema = z.object({
  provisionShareIds: z.boolean().default(false),
});

export const config = {
  api: {
    responseLimit: false,
  },
  maxDuration: 300,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || (req.method === 'POST' && isBot)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = requestSchema.safeParse(
    req.method === 'GET' ? { provisionShareIds: false } : req.body
  );
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    return;
  }

  try {
    const publicSpeakerRows = await getVisibleSpeakersForOg();
    if (publicSpeakerRows.length === 0) {
      throw new Error('The public speaker lineup is empty; refusing to create an incomplete export');
    }
    const publicSpeakers: SpeakerBadgeSource[] = publicSpeakerRows.map((speaker) => ({
      id: speaker.slug,
      slug: speaker.slug,
      first_name: speaker.first_name,
      last_name: speaker.last_name,
      company: speaker.company,
      job_title: speaker.job_title,
    }));
    const sources = await loadBadgeSources(
      createServiceRoleClient(),
      publicSpeakers,
      result.data.provisionShareIds
    );
    const files = await buildBadgeExportFiles(sources, getBaseUrl(), {
      csvPath: (fileName) => fileName,
      onWarning: (message) => log.warn(message),
    });
    const archive = createZip(files);
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="zurichjs-badges-${date}.zip"`);
    res.setHeader('Content-Length', archive.length);
    res.status(200).send(archive);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create badge export';
    const missingIds = /need share IDs/.test(message);
    log.error('Failed to create badge export', error);
    res.status(missingIds ? 409 : 500).json({ error: message });
  }
}
