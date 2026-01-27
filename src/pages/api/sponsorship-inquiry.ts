/**
 * Sponsorship Inquiry API Endpoint
 * Handles sponsorship inquiry submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendSponsorshipInquiryEmails } from '@/lib/email';
import { logger } from '@/lib/logger';
import { notifySponsorInterest } from '@/lib/platform-notifications';

const log = logger.scope('Sponsorship Inquiry API');

/**
 * Inquiry request body
 */
interface InquiryRequest {
  name: string;
  company: string;
  email: string;
  message: string;
}

/**
 * API response
 */
interface InquiryResponse {
  success: boolean;
  inquiryId?: string;
  message: string;
  error?: string;
}

/**
 * Generate an inquiry ID
 */
const generateInquiryId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `SPO-${timestamp}-${randomStr}`.toUpperCase();
};

/**
 * Validate inquiry request
 */
const validateRequest = (body: InquiryRequest): string | null => {
  if (!body.name?.trim()) {
    return 'Name is required';
  }

  if (!body.company?.trim()) {
    return 'Company is required';
  }

  if (!body.email?.trim()) {
    return 'Email is required';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return 'Invalid email address';
  }

  if (!body.message?.trim()) {
    return 'Message is required';
  }

  return null;
};

/**
 * API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InquiryResponse>
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST requests are allowed',
    });
    return;
  }

  try {
    const body = req.body as InquiryRequest;

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validationError,
      });
      return;
    }

    // Generate inquiry ID
    const inquiryId = generateInquiryId();

    log.info('Sponsorship inquiry received', {
      inquiryId,
      name: body.name,
      company: body.company,
      email: body.email,
      timestamp: new Date().toISOString(),
    });

    // Send emails (to admin and confirmation to sender)
    const emailResult = await sendSponsorshipInquiryEmails({
      name: body.name,
      company: body.company,
      email: body.email,
      message: body.message,
      inquiryId,
    });

    if (!emailResult.success) {
      log.error('Failed to send sponsorship inquiry emails', {
        inquiryId,
        error: emailResult.error,
      });
      // Still return success to the user, we have the inquiry logged
    }

    // Send Slack notification for sponsor interest
    notifySponsorInterest({
      submissionId: inquiryId,
      companyName: body.company,
      contactName: body.name,
      email: body.email,
    });

    // Return success response
    res.status(200).json({
      success: true,
      inquiryId,
      message: 'Your sponsorship inquiry has been submitted successfully. We will get back to you within 24-48 hours.',
    });
  } catch (error) {
    log.error('Error processing sponsorship inquiry', error);

    const errorMessage = error instanceof Error ? error.message : 'An error occurred';

    res.status(500).json({
      success: false,
      message: 'Failed to process sponsorship inquiry',
      error: errorMessage,
    });
  }
}
