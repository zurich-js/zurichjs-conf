/**
 * CFP Admin Speakers API
 * GET /api/admin/cfp/speakers - List all speakers
 * POST /api/admin/cfp/speakers - Create a new speaker manually
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSpeakers } from '@/lib/cfp/admin';
import { createSpeaker } from '@/lib/cfp/speakers';
import { verifyAdminToken } from '@/lib/admin/auth';
import type { AdminCreateSpeakerRequest } from '@/lib/types/cfp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const speakers = await getAdminSpeakers();
      return res.status(200).json({ speakers });
    } catch (error) {
      console.error('[CFP Admin Speakers API] GET Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data: AdminCreateSpeakerRequest = req.body;

      // Validate required fields
      if (!data.email || !data.first_name || !data.last_name) {
        return res.status(400).json({
          error: 'Email, first name, and last name are required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const { speaker, error } = await createSpeaker(data);

      if (error) {
        return res.status(400).json({ error });
      }

      return res.status(201).json({ speaker });
    } catch (error) {
      console.error('[CFP Admin Speakers API] POST Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
