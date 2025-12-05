/**
 * CFP Speaker Login API
 * POST /api/cfp/auth/login
 * Sends a magic link email to the speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendSpeakerMagicLink } from '@/lib/cfp/auth';
import { cfpLoginSchema } from '@/lib/validations/cfp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate input
    const result = cfpLoginSchema.safeParse({ email });
    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues[0].message
      });
    }

    // Send magic link
    const { success, error } = await sendSpeakerMagicLink(result.data.email);

    if (!success) {
      console.error('[CFP Login] Magic link error:', error);
      return res.status(500).json({
        error: error || 'Failed to send magic link'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Magic link sent successfully'
    });
  } catch (error) {
    console.error('[CFP Login] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
