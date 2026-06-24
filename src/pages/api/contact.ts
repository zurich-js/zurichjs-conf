/**
 * Contact API Endpoint
 * Handles general contact form submissions (inquiries & feedback) with
 * validation, spam protection, and rate limiting.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { contactMessageSchema } from '@/lib/validations/contact';
import { sendContactMessageEmail } from '@/lib/email/contact-emails';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const log = logger.scope('ContactAPI');

// Rate limiter: 5 requests per hour per IP
const rateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
});

interface ContactResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  remaining?: number;
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `contact-${timestamp}-${random}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContactResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const messageId = generateMessageId();

  try {
    // Rate limiting check
    const clientIp = getClientIp(req);
    const rateLimit = rateLimiter.check(clientIp);

    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded', { ip: clientIp, messageId });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        remaining: 0,
      });
    }

    // Validate request body
    const parseResult = contactMessageSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.debug('Validation failed', {
        messageId,
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
      log.info('Honeypot triggered, rejecting submission', { messageId });
      // Return success to not alert bots, but don't actually process
      return res.status(200).json({
        success: true,
        messageId,
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
    const emailResult = await sendContactMessageEmail({
      messageId,
      name: data.name,
      email: data.email,
      contactType: data.contactType,
      message: data.message,
      userAgent,
      submittedAt,
      posthogSessionId: data.posthogSessionId || undefined,
      posthogDistinctId: data.posthogDistinctId || undefined,
    });

    if (!emailResult.success) {
      log.error('Failed to send contact message email', {
        messageId,
        error: emailResult.error,
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to send your message. Please try again later.',
      });
    }

    log.info('Contact message submitted successfully', {
      messageId,
      contactType: data.contactType,
      hasPosthogSession: !!data.posthogSessionId,
    });

    return res.status(200).json({
      success: true,
      messageId,
      remaining: rateLimit.remaining,
    });
  } catch (error) {
    log.error('Error processing contact message', error, { messageId });

    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
