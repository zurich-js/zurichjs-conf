/**
 * Newsletter Subscription API Endpoint
 * Handles newsletter signups using Resend Contacts API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { addNewsletterContact } from '@/lib/email';
import { serverAnalytics } from '@/lib/analytics/server';

interface SubscribeRequest {
  email: string;
  source?: 'footer' | 'popup' | 'checkout' | 'other';
}

interface SubscribeResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubscribeResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { email, source = 'footer' }: SubscribeRequest = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      await serverAnalytics.error('anonymous', 'Invalid email provided for newsletter', {
        type: 'validation',
        severity: 'low',
        code: 'NEWSLETTER_INVALID_EMAIL',
      });

      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await serverAnalytics.error(email, 'Invalid email format for newsletter', {
        type: 'validation',
        severity: 'low',
        code: 'NEWSLETTER_INVALID_EMAIL_FORMAT',
      });

      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address',
      });
    }

    // Add contact to newsletter
    const result = await addNewsletterContact(email, source);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to subscribe to newsletter',
      });
    }

    // Flush analytics events before responding
    await serverAnalytics.flush();

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await serverAnalytics.error('anonymous', errorMessage, {
      type: 'system',
      severity: 'high',
      code: 'NEWSLETTER_API_ERROR',
    });

    await serverAnalytics.flush();

    return res.status(500).json({
      success: false,
      error: 'An error occurred while subscribing to newsletter',
    });
  }
}
