/**
 * CFP Admin Resend Reviewer Invitation API
 * POST /api/admin/cfp/reviewers/[id]/resend - Resend invitation email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReviewerById } from '@/lib/cfp/reviewers';
import { verifyAdminToken } from '@/lib/admin/auth';
import { sendReviewerInvitationEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Reviewer ID is required' });
  }

  try {
    // Get reviewer
    const reviewer = await getReviewerById(id);

    if (!reviewer) {
      return res.status(404).json({ error: 'Reviewer not found' });
    }

    if (reviewer.accepted_at) {
      return res.status(400).json({ error: 'Reviewer has already accepted the invitation' });
    }

    // Determine access level from role and can_see_speaker_identity
    let accessLevel: 'full_access' | 'anonymous' | 'readonly' = 'anonymous';
    if (reviewer.role === 'readonly') {
      accessLevel = 'readonly';
    } else if (reviewer.can_see_speaker_identity) {
      accessLevel = 'full_access';
    }

    // Send invitation email
    const emailResult = await sendReviewerInvitationEmail({
      to: reviewer.email,
      reviewerName: reviewer.name || undefined,
      accessLevel,
    });

    if (!emailResult.success) {
      console.error('[Resend Invitation] Failed to send email:', emailResult.error);
      return res.status(500).json({ error: emailResult.error || 'Failed to send email' });
    }

    console.log(`[Resend Invitation] Successfully sent invitation email to: ${reviewer.email}`);

    return res.status(200).json({
      success: true,
      message: `Invitation resent to ${reviewer.email}`
    });
  } catch (error) {
    console.error('[Admin Resend Invitation API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
