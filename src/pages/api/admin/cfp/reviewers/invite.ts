/**
 * CFP Admin Invite Reviewer API
 * POST /api/admin/cfp/reviewers/invite - Invite a new reviewer
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { inviteReviewer } from '@/lib/cfp/reviewers';
import { verifyAdminToken } from '@/lib/admin/auth';
import { sendReviewerInvitationEmail } from '@/lib/email';
import { reviewerInviteSchema } from '@/lib/validations/cfp';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const log = logger.scope('AdminReviewerInviteAPI');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate request body with Zod
  const result = reviewerInviteSchema.safeParse(req.body);
  if (!result.success) {
    log.debug('Validation failed', { issues: result.error.issues });
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
  }

  const { email, name, role, can_see_speaker_identity } = result.data;

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
      log.warn('Failed to invite reviewer', { error, email });
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
      log.warn('Invitation email failed to send', { email, error: emailResult.error });
      // Still return success since the reviewer was created, but include a warning
      return res.status(201).json({
        reviewer,
        warning: 'Reviewer created but invitation email failed to send',
      });
    }

    log.info('Reviewer invited', { email, role, reviewerId: reviewer?.id });

    return res.status(201).json({ reviewer });
  } catch (error) {
    log.error('Failed to invite reviewer', error, { type: 'system', email });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
