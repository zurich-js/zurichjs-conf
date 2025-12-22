/**
 * Reviewer Login API
 * POST /api/cfp/reviewer/auth/login - Send magic link to reviewer
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendReviewerMagicLink, getReviewerByEmail } from '@/lib/cfp/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if reviewer exists and is active
    const reviewer = await getReviewerByEmail(email.toLowerCase());

    if (!reviewer) {
      // Don't reveal whether email exists - generic message
      return res.status(200).json({ success: true });
    }

    // Send magic link
    const { success, error } = await sendReviewerMagicLink(email.toLowerCase(), req);

    if (!success) {
      console.error('[Reviewer Login API] Magic link error:', error);
      // Return actual error for debugging (in production you might want to hide this)
      return res.status(500).json({ error: error || 'Failed to send login link' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Reviewer Login API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
