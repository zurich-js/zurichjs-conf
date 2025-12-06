/**
 * CFP Admin Speakers API
 * GET /api/admin/cfp/speakers - List all speakers
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSpeakers } from '@/lib/cfp/admin';
import { verifyAdminToken } from '@/lib/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const speakers = await getAdminSpeakers();
    return res.status(200).json({ speakers });
  } catch (error) {
    console.error('[CFP Admin Speakers API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
