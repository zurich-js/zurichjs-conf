/**
 * CFP Admin Invite Reviewer API
 * POST /api/admin/cfp/reviewers/invite - Invite a new reviewer
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { inviteReviewer } from '@/lib/cfp/reviewers';
import { verifyAdminToken } from '@/lib/admin/auth';
import { sendReviewerInvitationEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email, name, role, can_see_speaker_identity } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { reviewer, error } = await inviteReviewer(
      {
        email,
        name: name || undefined,
        role: role || 'reviewer',
        can_see_speaker_identity: can_see_speaker_identity ?? false,
      },
      null // Admin invitations don't have a reviewer ID
    );

    if (error) {
      return res.status(400).json({ error });
    }

    // Determine access level for email
    let accessLevel: 'full_access' | 'anonymous' | 'readonly' = 'anonymous';
    if (role === 'readonly') {
      accessLevel = 'readonly';
    } else if (can_see_speaker_identity) {
      accessLevel = 'full_access';
    }

    // Send invitation email
    const emailResult = await sendReviewerInvitationEmail({
      to: email,
      reviewerName: name || undefined,
      accessLevel,
    });

    if (!emailResult.success) {
      console.error('[CFP Admin Invite API] Failed to send email:', emailResult.error);
      // Still return success since the reviewer was created, but include a warning
      return res.status(201).json({
        reviewer,
        warning: 'Reviewer created but invitation email failed to send',
      });
    }

    console.log(`[CFP Admin Invite API] Invitation email sent to: ${email}`);

    return res.status(201).json({ reviewer });
  } catch (error) {
    console.error('[CFP Admin Invite API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
