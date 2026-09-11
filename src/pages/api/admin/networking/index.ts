/**
 * Admin Networking Directory API
 * GET /api/admin/networking — everyone who has set up networking (attendees,
 * sponsors, manually added badge rows), with whether it is currently public,
 * which links they configured, and their share page. Read-only.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getBadgeBaseUrl } from '@/lib/badges/url';
import { logger } from '@/lib/logger';
import { loadNetworkingDirectory } from '@/lib/networking/directory';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Admin Networking Directory API');

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Contact emails and personal links — never let a browser or CDN keep a copy
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const directory = await loadNetworkingDirectory(createServiceRoleClient(), getBadgeBaseUrl(req));
    res.status(200).json(directory);
  } catch (error) {
    log.error('Failed to build networking directory', error);
    res.status(500).json({ error: 'Failed to load networking directory' });
  }
}
