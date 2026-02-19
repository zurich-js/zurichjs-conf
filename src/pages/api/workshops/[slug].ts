/**
 * Public Workshop Detail API
 * GET /api/workshops/[slug] - Get a single published workshop by slug
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getWorkshopBySlug } from '@/lib/workshops';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    res.status(400).json({ error: 'Missing workshop slug' });
    return;
  }

  try {
    const result = await getWorkshopBySlug(slug);

    if (!result.success || !result.workshop) {
      res.status(404).json({ error: result.error || 'Workshop not found' });
      return;
    }

    res.status(200).json({ workshop: result.workshop });
  } catch (error) {
    console.error('Error in workshop detail API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
