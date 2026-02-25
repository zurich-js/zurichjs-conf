/**
 * CFP Admin Decision API
 * POST /api/admin/cfp/submissions/[id]/decision - Make accept/reject decision (status change only, no email)
 * GET /api/admin/cfp/submissions/[id]/decision - Get decision status and history
 *
 * NOTE: Email sending is handled separately via /api/admin/cfp/submissions/[id]/schedule-email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { makeDecision, getDecisionStatus, getDecisionHistory } from '@/lib/cfp/decisions';
import { getScheduledEmailsForSubmission } from '@/lib/cfp/scheduled-emails';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Decision API');

/**
 * Request schema for making a decision
 * NOTE: send_email removed - use schedule-email endpoint instead
 */
const makeDecisionSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, id);
  } else if (req.method === 'POST') {
    return handlePost(req, res, id, 'admin');
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Get decision status, history, and scheduled emails
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse, submissionId: string) {
  try {
    const [status, history, scheduledEmails] = await Promise.all([
      getDecisionStatus(submissionId),
      getDecisionHistory(submissionId),
      getScheduledEmailsForSubmission(submissionId),
    ]);

    if (!status) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.status(200).json({
      status,
      history,
      scheduled_emails: scheduledEmails,
    });
  } catch (error) {
    log.error('Error fetching decision status', error, { submissionId });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST - Make a decision (accept or reject)
 * NOTE: This only changes the decision status. Emails are scheduled separately.
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  submissionId: string,
  adminToken: string
) {
  // Validate request body
  const result = makeDecisionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
  }

  try {
    // Make decision without sending email (email is scheduled separately)
    const decisionResult = await makeDecision(
      {
        submission_id: submissionId,
        decision: result.data.decision,
        notes: result.data.notes,
        // Never send email from decision endpoint - use schedule-email instead
        send_email: false,
      },
      adminToken
    );

    if (!decisionResult.success) {
      return res.status(400).json({ error: decisionResult.error || 'Failed to make decision' });
    }

    log.info('Decision made successfully', {
      submissionId,
      decision: result.data.decision,
    });

    return res.status(200).json({
      success: true,
      decision_status: decisionResult.decision_status,
    });
  } catch (error) {
    log.error('Error making decision', error, { submissionId });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
