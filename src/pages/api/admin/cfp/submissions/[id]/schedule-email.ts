/**
 * CFP Admin Schedule Email API
 * POST /api/admin/cfp/submissions/[id]/schedule-email - Schedule acceptance or rejection email
 * DELETE /api/admin/cfp/submissions/[id]/schedule-email - Cancel a scheduled email
 * GET /api/admin/cfp/submissions/[id]/schedule-email - Get scheduled emails for submission
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  scheduleAcceptanceEmail,
  scheduleRejectionEmail,
  cancelScheduledEmail,
  getScheduledEmailsForSubmission,
  sendScheduledEmailNow,
} from '@/lib/cfp/scheduled-emails';
import { REJECTION_COUPON } from '@/lib/cfp/config';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Schedule Email API');

/**
 * Request schema for scheduling an email
 */
const scheduleEmailSchema = z.object({
  email_type: z.enum(['acceptance', 'rejection']),
  personal_message: z.string().optional(),
  // Rejection-specific fields
  coupon_discount_percent: z
    .number()
    .min(REJECTION_COUPON.MIN_DISCOUNT_PERCENT)
    .max(REJECTION_COUPON.MAX_DISCOUNT_PERCENT)
    .optional(),
  coupon_validity_days: z
    .number()
    .min(REJECTION_COUPON.MIN_VALIDITY_DAYS)
    .max(REJECTION_COUPON.MAX_VALIDITY_DAYS)
    .optional()
    .default(REJECTION_COUPON.DEFAULT_VALIDITY_DAYS),
  include_feedback: z.boolean().optional().default(false),
  feedback_text: z.string().optional(),
});

/**
 * Request schema for sending an email immediately
 */
const sendNowSchema = z.object({
  scheduled_email_id: z.string().uuid(),
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
  } else if (req.method === 'PUT') {
    return handlePut(req, res, 'admin');
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, 'admin');
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Get scheduled emails for submission
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse, submissionId: string) {
  try {
    const scheduledEmails = await getScheduledEmailsForSubmission(submissionId);

    return res.status(200).json({
      scheduled_emails: scheduledEmails,
    });
  } catch (error) {
    log.error('Error fetching scheduled emails', error, { submissionId });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST - Schedule an acceptance or rejection email
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  submissionId: string,
  adminToken: string
) {
  // Validate request body
  const result = scheduleEmailSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
  }

  try {
    const request = {
      submission_id: submissionId,
      email_type: result.data.email_type,
      personal_message: result.data.personal_message,
      coupon_discount_percent: result.data.coupon_discount_percent,
      coupon_validity_days: result.data.coupon_validity_days,
      include_feedback: result.data.include_feedback,
      feedback_text: result.data.feedback_text,
    };

    // Schedule the appropriate email type
    const scheduleResult = result.data.email_type === 'acceptance'
      ? await scheduleAcceptanceEmail(request, adminToken)
      : await scheduleRejectionEmail(request, adminToken);

    if (!scheduleResult.success) {
      return res.status(400).json({
        error: scheduleResult.error || 'Failed to schedule email',
        scheduled_email: scheduleResult.scheduled_email,
      });
    }

    log.info('Email scheduled successfully', {
      submissionId,
      emailType: result.data.email_type,
      scheduledFor: scheduleResult.scheduled_for,
    });

    return res.status(200).json({
      success: true,
      scheduled_email: scheduleResult.scheduled_email,
      scheduled_for: scheduleResult.scheduled_for,
    });
  } catch (error) {
    log.error('Error scheduling email', error, { submissionId });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT - Send a scheduled email immediately
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse, adminToken: string) {
  // Validate request body
  const result = sendNowSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
  }

  const { scheduled_email_id } = result.data;

  try {
    const sendResult = await sendScheduledEmailNow(scheduled_email_id, adminToken);

    if (!sendResult.success) {
      return res.status(400).json({ error: sendResult.error || 'Failed to send email' });
    }

    log.info('Scheduled email sent immediately', { scheduledEmailId: scheduled_email_id });

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    log.error('Error sending scheduled email immediately', error, { scheduledEmailId: scheduled_email_id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE - Cancel a scheduled email
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse, adminToken: string) {
  // Get scheduled_email_id from query or body
  const scheduledEmailId = req.query.scheduled_email_id || req.body?.scheduled_email_id;

  if (!scheduledEmailId || typeof scheduledEmailId !== 'string') {
    return res.status(400).json({ error: 'scheduled_email_id is required' });
  }

  try {
    const cancelResult = await cancelScheduledEmail(scheduledEmailId, adminToken);

    if (!cancelResult.success) {
      return res.status(400).json({ error: cancelResult.error || 'Failed to cancel email' });
    }

    log.info('Scheduled email cancelled', { scheduledEmailId });

    return res.status(200).json({
      success: true,
      message: 'Scheduled email cancelled successfully',
    });
  } catch (error) {
    log.error('Error cancelling scheduled email', error, { scheduledEmailId });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
