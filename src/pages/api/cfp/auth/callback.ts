/**
 * CFP Auth Callback API
 * POST /api/cfp/auth/callback
 * Creates or links speaker profile after successful magic link authentication
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrCreateSpeaker } from '@/lib/cfp/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        error: 'Missing required fields: userId and email'
      });
    }

    // Get or create speaker profile
    const { speaker, error } = await getOrCreateSpeaker(userId, email);

    if (error || !speaker) {
      console.error('[CFP Auth Callback] Speaker error:', error);
      return res.status(500).json({
        error: error || 'Failed to set up speaker profile'
      });
    }

    return res.status(200).json({
      success: true,
      speaker: {
        id: speaker.id,
        email: speaker.email,
        firstName: speaker.first_name,
        lastName: speaker.last_name,
        isProfileComplete: !!(speaker.first_name && speaker.last_name && speaker.bio)
      }
    });
  } catch (error) {
    console.error('[CFP Auth Callback] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
