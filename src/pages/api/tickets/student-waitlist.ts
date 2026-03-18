/**
 * Student Ticket Waitlist API
 * Adds email to a dedicated Resend audience and sends a Slack notification
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { addStudentWaitlistContact } from '@/lib/email';
import { notifyStudentTicketWaitlist } from '@/lib/platform-notifications/send';
import { serverAnalytics } from '@/lib/analytics/server';

interface WaitlistResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WaitlistResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address',
      });
    }

    const result = await addStudentWaitlistContact(email);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to join waitlist',
      });
    }

    // Fire-and-forget Slack notification
    notifyStudentTicketWaitlist({ email });

    await serverAnalytics.flush();

    return res.status(200).json({
      success: true,
      message: 'Successfully joined the student ticket waitlist',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await serverAnalytics.error('anonymous', errorMessage, {
      type: 'system',
      severity: 'high',
      code: 'STUDENT_WAITLIST_API_ERROR',
    });

    await serverAnalytics.flush();

    return res.status(500).json({
      success: false,
      error: 'An error occurred while joining the waitlist',
    });
  }
}
