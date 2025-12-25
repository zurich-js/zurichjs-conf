/**
 * Suggested Tags API
 * GET /api/cfp/tags/suggested - Get suggested tags for submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSuggestedTags, searchTags } from '@/lib/cfp/tags';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Tags API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q } = req.query;

    // If search query provided, search tags
    if (q && typeof q === 'string' && q.trim()) {
      const tags = await searchTags(q.trim());
      return res.status(200).json({ tags });
    }

    // Otherwise return suggested tags
    const tags = await getSuggestedTags();
    return res.status(200).json({ tags });
  } catch (error) {
    log.error('Failed to get tags', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
