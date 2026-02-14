/**
 * Report Issue API Endpoint
 * Handles issue report form submissions with validation, spam protection, and rate limiting
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { issueReportSchema } from '@/lib/validations/issue-report';
import { sendIssueReportEmail } from '@/lib/email/issue-report-emails';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const log = logger.scope('IssueReportAPI');

// Rate limiter: 5 requests per hour per IP
const rateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
});

interface IssueReportResponse {
  success: boolean;
  reportId?: string;
  error?: string;
  remaining?: number;
}

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `issue-${timestamp}-${random}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IssueReportResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const reportId = generateReportId();

  try {
    // Rate limiting check
    const clientIp = getClientIp(req);
    const rateLimit = rateLimiter.check(clientIp);

    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded', { ip: clientIp, reportId });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        remaining: 0,
      });
    }

    // Validate request body
    const parseResult = issueReportSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.debug('Validation failed', {
        reportId,
        issues: parseResult.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid request data',
      });
    }

    const data = parseResult.data;

    // Honeypot check - if website field is filled, reject silently
    if (data.website && data.website.length > 0) {
      log.info('Honeypot triggered, rejecting submission', { reportId });
      // Return success to not alert bots, but don't actually process
      return res.status(200).json({
        success: true,
        reportId,
        remaining: rateLimit.remaining,
      });
    }

    // Format timestamp for email
    const submittedAt = new Date().toLocaleString('en-CH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Zurich',
    });

    // Get user agent for debugging
    const userAgent = req.headers['user-agent'] || undefined;

    // Send email to organizers
    const emailResult = await sendIssueReportEmail({
      reportId,
      name: data.name,
      email: data.email,
      issueType: data.issueType,
      pageUrl: data.pageUrl || undefined,
      description: data.description,
      suggestedFix: data.suggestedFix || undefined,
      screenshotUrl: data.screenshotUrl || undefined,
      rewardPreference: data.rewardPreference,
      userAgent,
      submittedAt,
      posthogSessionId: data.posthogSessionId || undefined,
      posthogDistinctId: data.posthogDistinctId || undefined,
    });

    if (!emailResult.success) {
      log.error('Failed to send issue report email', {
        reportId,
        error: emailResult.error,
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to submit report. Please try again later.',
      });
    }

    log.info('Issue report submitted successfully', {
      reportId,
      issueType: data.issueType,
      hasPosthogSession: !!data.posthogSessionId,
    });

    return res.status(200).json({
      success: true,
      reportId,
      remaining: rateLimit.remaining,
    });
  } catch (error) {
    log.error('Error processing issue report', error, { reportId });

    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
