/**
 * Admin Cache Invalidation API
 * POST /api/admin/cache/invalidate
 * Clears the server-side in-memory cache for speaker/schedule data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { memoryCache } from '@/lib/cache/memory-cache';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Cache API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean } | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  memoryCache.invalidateAll();
  log.info('Server-side cache invalidated by admin');

  return res.status(200).json({ success: true });
}
