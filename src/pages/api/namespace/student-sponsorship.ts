import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'node:crypto';
import { sendNamespaceStudentSponsorshipEmail } from '@/lib/email/namespace-student-sponsorship';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { namespaceStudentSponsorshipSchema } from '@/lib/validations/namespace';

const log = logger.scope('Namespace Student Sponsorship API');
const namespaceStudentSponsorshipGoogleFormUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLScpq-Orha6BeQ4SCSQ5XSeowrFybb-jg8Q7Xh1oh8hZnxc0-w/viewform';
const namespaceStudentSponsorshipClosesAt = '2026-07-19T21:59:59.999Z';

const rateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 6,
});

interface NamespaceStudentSponsorshipResponse {
  success: boolean;
  submissionId?: string;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  fallbackUrl: string;
  remaining?: number;
}

function generateSubmissionId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `namespace-${timestamp}-${random}`;
}

function formatSubmittedAt(date: Date): string {
  return date.toLocaleString('en-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  });
}

function isNamespaceStudentSponsorshipClosed(now = new Date()): boolean {
  return now.getTime() > new Date(namespaceStudentSponsorshipClosesAt).getTime();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NamespaceStudentSponsorshipResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
    });
  }

  const submissionId = generateSubmissionId();

  try {
    const clientIp = getClientIp(req);
    const rateLimit = rateLimiter.check(clientIp);

    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded', { submissionId, ip: clientIp });
      return res.status(429).json({
        success: false,
        error: 'Too many submissions. Please try again later or use the Google Form fallback.',
        fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
        remaining: 0,
      });
    }

    if (isNamespaceStudentSponsorshipClosed()) {
      return res.status(403).json({
        success: false,
        error: 'The Namespace Student Sponsorship challenge is closed.',
        fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
        remaining: rateLimit.remaining,
      });
    }

    const parseResult = namespaceStudentSponsorshipSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid submission',
        issues: parseResult.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
        remaining: rateLimit.remaining,
      });
    }

    const data = parseResult.data;

    if (data.website && data.website.trim().length > 0) {
      log.info('Honeypot triggered, rejecting silently', { submissionId });
      return res.status(200).json({
        success: true,
        submissionId,
        fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
        remaining: rateLimit.remaining,
      });
    }

    const emailResult = await sendNamespaceStudentSponsorshipEmail({
      submissionId,
      fullName: data.fullName,
      email: data.email,
      universityName: data.universityName,
      degreeName: data.degreeName,
      githubUrl: data.githubUrl,
      codeUrl: data.codeUrl,
      setupInstructions: data.setupInstructions,
      prideExplanation: data.prideExplanation,
      anythingElse: data.anythingElse || undefined,
      submittedAt: formatSubmittedAt(new Date()),
      userAgent: req.headers['user-agent'],
      posthogSessionId: data.posthogSessionId,
      posthogDistinctId: data.posthogDistinctId,
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send your submission.',
        fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
        remaining: rateLimit.remaining,
      });
    }

    log.info('Namespace student sponsorship submitted', {
      submissionId,
      hasPosthogSession: !!data.posthogSessionId,
    });

    return res.status(200).json({
      success: true,
      submissionId,
      fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
      remaining: rateLimit.remaining,
    });
  } catch (error) {
    log.error('Error processing Namespace student sponsorship submission', error, {
      submissionId,
    });

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.',
      fallbackUrl: namespaceStudentSponsorshipGoogleFormUrl,
    });
  }
}
