/**
 * Public Workshops API
 * GET /api/workshops - List published workshops
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublishedWorkshops } from '@/lib/workshops';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const result = await getPublishedWorkshops();

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ workshops: result.workshops || [] });
  } catch (error) {
    console.error('Error in workshops API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
