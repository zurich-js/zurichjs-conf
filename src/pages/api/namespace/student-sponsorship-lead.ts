import type { NextApiRequest, NextApiResponse } from 'next';
import { serverAnalytics } from '@/lib/analytics/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { persistNamespaceStudentSponsorshipApplication } from '@/lib/namespace/student-sponsorship-persistence';
import { namespaceStudentSponsorshipLeadSchema } from '@/lib/validations/namespace';

const log = logger.scope('Namespace Student Sponsorship Lead API');

const rateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
});

interface NamespaceStudentSponsorshipLeadResponse {
  success: boolean;
  applicationId?: string;
  error?: string;
  remaining?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NamespaceStudentSponsorshipLeadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const clientIp = getClientIp(req);
    const rateLimit = rateLimiter.check(clientIp);

    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded', { ip: clientIp });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        remaining: 0,
      });
    }

    const parseResult = namespaceStudentSponsorshipLeadSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid email',
        remaining: rateLimit.remaining,
      });
    }

    const data = {
      ...parseResult.data,
      email: parseResult.data.email.trim().toLowerCase(),
    };
    const persistence = await persistNamespaceStudentSponsorshipApplication({
      applicationId: data.applicationId,
      email: data.email,
      fullName: data.fullName,
      universityName: data.universityName,
      degreeName: data.degreeName,
      githubUrl: data.githubUrl,
      codeUrl: data.codeUrl,
      setupInstructions: data.setupInstructions,
      prideExplanation: data.prideExplanation,
      anythingElse: data.anythingElse,
      processingConsent: data.processingConsent,
      status: 'partial',
      posthogSessionId: data.posthogSessionId,
      posthogDistinctId: data.posthogDistinctId,
      userAgent: req.headers['user-agent'],
    });

    if (!persistence.application) {
      log.error('Failed to persist Namespace student sponsorship lead', persistence.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save your application progress.',
        remaining: rateLimit.remaining,
      });
    }

    await serverAnalytics.identify(data.email, {
      email: data.email,
      namespace_student_sponsorship_lead: true,
      namespace_student_sponsorship_email_captured_at: new Date().toISOString(),
      posthog_session_id: data.posthogSessionId,
      posthog_distinct_id: data.posthogDistinctId,
    });

    await serverAnalytics.track('namespace_student_sponsorship_email_captured', data.email, {
      email: data.email,
      form_name: 'namespace_student_sponsorship',
      capture_source: 'email_blur',
      posthog_session_id: data.posthogSessionId,
      posthog_distinct_id: data.posthogDistinctId,
    });

    await serverAnalytics.flush();

    return res.status(200).json({
      success: true,
      applicationId: persistence.application.id,
      remaining: rateLimit.remaining,
    });
  } catch (error) {
    log.error('Error capturing Namespace student sponsorship lead', error);

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.',
    });
  }
}
