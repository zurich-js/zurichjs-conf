/**
 * CFP Admin Sessions API
 * POST /api/admin/cfp/sessions - Create a new session for a speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSession } from '@/lib/cfp/speakers';
import { verifyAdminToken } from '@/lib/admin/auth';
import type { AdminCreateSessionRequest } from '@/lib/types/cfp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data: AdminCreateSessionRequest = req.body;

    // Validate required fields
    if (!data.speaker_id || !data.title || !data.abstract) {
      return res.status(400).json({
        error: 'Speaker ID, title, and abstract are required',
      });
    }

    if (!data.submission_type || !['lightning', 'standard', 'workshop'].includes(data.submission_type)) {
      return res.status(400).json({
        error: 'Valid submission type is required (lightning, standard, or workshop)',
      });
    }

    if (!data.talk_level || !['beginner', 'intermediate', 'advanced'].includes(data.talk_level)) {
      return res.status(400).json({
        error: 'Valid talk level is required (beginner, intermediate, or advanced)',
      });
    }

    const { submission, error } = await createSession(data);

    if (error) {
      return res.status(400).json({ error });
    }

    return res.status(201).json({ session: submission });
  } catch (error) {
    console.error('[CFP Admin Sessions API] POST Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
