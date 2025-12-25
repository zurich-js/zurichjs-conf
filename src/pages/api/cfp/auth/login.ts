/**
 * CFP Speaker Login API
 * POST /api/cfp/auth/login
 * Sends a magic link email to the speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendSpeakerMagicLink } from '@/lib/cfp/auth';
import { cfpLoginSchema } from '@/lib/validations/cfp';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';

const log = logger.scope('CFP Login');

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
    const { success, error } = await sendSpeakerMagicLink(result.data.email, req);

    if (!success) {
      log.error('Failed to send magic link', error, { email: result.data.email });
      return res.status(500).json({
        error: error || 'Failed to send magic link'
      });
    }

    // Track login attempt
    await serverAnalytics.track('cfp_login_requested', result.data.email, {
      email: result.data.email,
    });

    log.info('Magic link sent successfully', { email: result.data.email });

    return res.status(200).json({
      success: true,
      message: 'Magic link sent successfully'
    });
  } catch (error) {
    log.error('Unexpected error in login', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
