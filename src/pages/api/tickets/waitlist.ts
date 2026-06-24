/**
 * Ticket Waitlist API
 * Adds an email to the Resend audience for a sold-out ticket type
 * (student/unemployed or VIP) and sends a Slack notification.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { addTicketWaitlistContact, sendTicketWaitlistConfirmationEmail } from '@/lib/email';
import { notifyTicketWaitlist } from '@/lib/platform-notifications/send';
import { serverAnalytics } from '@/lib/analytics/server';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  type: z.enum(['student', 'vip']),
});

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
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid input',
      });
    }

    const { email, type } = parsed.data;

    const result = await addTicketWaitlistContact(email, type);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to join waitlist',
      });
    }

    // Fire-and-forget Slack notification
    notifyTicketWaitlist({ email, ticketType: type });

    // Send confirmation email. Don't fail the request if it errors — the
    // subscriber is already on the waitlist; the email is best-effort.
    await sendTicketWaitlistConfirmationEmail(email, type);

    await serverAnalytics.flush();

    return res.status(200).json({
      success: true,
      message: 'Successfully joined the ticket waitlist',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await serverAnalytics.error('anonymous', errorMessage, {
      type: 'system',
      severity: 'high',
      code: 'TICKET_WAITLIST_API_ERROR',
    });

    await serverAnalytics.flush();

    return res.status(500).json({
      success: false,
      error: 'An error occurred while joining the waitlist',
    });
  }
}
