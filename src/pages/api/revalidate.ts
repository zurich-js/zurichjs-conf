/**
 * On-Demand ISR Revalidation API
 * POST /api/revalidate
 *
 * Revalidates one or more ISR pages immediately.
 * Protected by a shared secret (REVALIDATION_SECRET env var)
 * or admin auth.
 *
 * Body: { paths: string[] }
 * Example: { "paths": ["/speakers", "/speakers/jane-doe", "/talks"] }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Revalidation API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ revalidated: string[]; failed: string[] } | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Allow either secret token or admin auth
  const secret = req.headers['x-revalidation-secret'] || req.query.secret;
  const isSecretValid = process.env.REVALIDATION_SECRET && secret === process.env.REVALIDATION_SECRET;
  const { authorized } = verifyAdminAccess(req);

  if (!isSecretValid && !authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { paths } = req.body as { paths?: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: 'paths must be a non-empty array of URL paths' });
  }

  const revalidated: string[] = [];
  const failed: string[] = [];

  for (const path of paths) {
    try {
      await res.revalidate(path);
      revalidated.push(path);
    } catch (err) {
      log.warn('Failed to revalidate path', { path, error: err });
      failed.push(path);
    }
  }

  log.info('Revalidation complete', { revalidated, failed });
  return res.status(200).json({ revalidated, failed });
}
