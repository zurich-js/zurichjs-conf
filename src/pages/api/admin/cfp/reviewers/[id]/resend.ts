/**
 * CFP Admin Resend Reviewer Invitation API
 * POST /api/admin/cfp/reviewers/[id]/resend - Resend invitation email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReviewerById } from '@/lib/cfp/reviewers';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { sendReviewerInvitationEmail } from '@/lib/email';
import {
  REVIEWER_INVITATION_ACCESS_LEVELS,
  type ReviewerInvitationAccessLevel,
} from '@/lib/email/types';
import { logger } from '@/lib/logger';
import { CFP_REVIEWER_ROLES } from '@/lib/types/cfp';

const log = logger.scope('Admin Resend Invitation API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
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

    // Determine access level from role.
    let accessLevel: ReviewerInvitationAccessLevel = REVIEWER_INVITATION_ACCESS_LEVELS.ANONYMOUS;
    if (reviewer.role === CFP_REVIEWER_ROLES.READONLY) {
      accessLevel = REVIEWER_INVITATION_ACCESS_LEVELS.READONLY;
    } else if (reviewer.role === CFP_REVIEWER_ROLES.COMMITTEE_MEMBER) {
      accessLevel = REVIEWER_INVITATION_ACCESS_LEVELS.COMMITTEE_MEMBER;
    } else if (reviewer.role === CFP_REVIEWER_ROLES.SUPER_ADMIN) {
      accessLevel = REVIEWER_INVITATION_ACCESS_LEVELS.FULL_ACCESS;
    }

    // Send invitation email
    const emailResult = await sendReviewerInvitationEmail({
      to: reviewer.email,
      reviewerName: reviewer.name || undefined,
      accessLevel,
    });

    if (!emailResult.success) {
      log.error('Failed to send email', { error: emailResult.error });
      return res.status(500).json({ error: emailResult.error || 'Failed to send email' });
    }

    log.info('Successfully sent invitation email', { email: reviewer.email });

    return res.status(200).json({
      success: true,
      message: `Invitation resent to ${reviewer.email}`
    });
  } catch (error) {
    log.error('Error resending invitation', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
