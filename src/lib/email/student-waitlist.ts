/**
 * Student Ticket Waitlist
 * Manages a separate Resend audience for student/unemployed ticket waitlist subscribers
 */

import { serverAnalytics } from '@/lib/analytics/server';
import { getResendClient } from './config';

const AUDIENCE_ID = process.env.RESEND_STUDENT_WAITLIST_AUDIENCE_ID;

/**
 * Add a contact to the student ticket waitlist audience in Resend
 */
export async function addStudentWaitlistContact(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!AUDIENCE_ID) {
      throw new Error('RESEND_STUDENT_WAITLIST_AUDIENCE_ID is not configured');
    }

    const resend = getResendClient();

    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId: AUDIENCE_ID,
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
      code: 'STUDENT_WAITLIST_SUBSCRIPTION_ERROR',
    });

    return { success: false, error: errorMessage };
  }
}
