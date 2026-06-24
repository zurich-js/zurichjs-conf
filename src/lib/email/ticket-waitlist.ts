/**
 * Ticket Waitlist
 * Manages per-type Resend audiences for sold-out ticket waitlist subscribers.
 * Each waitlist type (student/unemployed, VIP) maps to its own Resend audience.
 */

import { serverAnalytics } from '@/lib/analytics/server';
import { getResendClient } from './config';

/**
 * Ticket waitlist types. Each maps to a dedicated Resend audience.
 */
export type TicketWaitlistType = 'student' | 'vip';

const AUDIENCE_ENV_VARS: Record<TicketWaitlistType, string> = {
  student: 'RESEND_STUDENT_WAITLIST_AUDIENCE_ID',
  vip: 'RESEND_VIP_WAITLIST_AUDIENCE_ID',
};

/**
 * Add a contact to the waitlist audience for the given ticket type in Resend
 */
export async function addTicketWaitlistContact(
  email: string,
  type: TicketWaitlistType
): Promise<{ success: boolean; error?: string }> {
  try {
    const envVar = AUDIENCE_ENV_VARS[type];
    const audienceId = process.env[envVar];

    if (!audienceId) {
      throw new Error(`${envVar} is not configured`);
    }

    const resend = getResendClient();

    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId,
    });

    if ('error' in result && result.error) {
      await serverAnalytics.track('newsletter_subscribed', email, {
        email,
        subscription_source: 'other' as const,
        subscription_success: false,
        error_message: result.error.message || 'Failed to add contact',
      });

      return {
        success: false,
        error: result.error.message || 'Failed to add contact',
      };
    }

    await serverAnalytics.track('newsletter_subscribed', email, {
      email,
      subscription_source: 'other' as const,
      subscription_success: true,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await serverAnalytics.error(email, errorMessage, {
      type: 'system',
      severity: 'medium',
      code: 'TICKET_WAITLIST_SUBSCRIPTION_ERROR',
    });

    return { success: false, error: errorMessage };
  }
}
