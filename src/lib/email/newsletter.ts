/**
 * Newsletter Functions
 * Handles adding contacts to the newsletter using Resend's Contacts API
 */

import { serverAnalytics } from '@/lib/analytics/server';
import { getResendClient } from './config';

/**
 * Add a contact to the newsletter
 * Uses Resend's Contacts API to add contacts to the mailing list
 * As of November 2025, contacts are global entities and don't require an audienceId
 */
export async function addNewsletterContact(
  email: string,
  source: 'footer' | 'popup' | 'checkout' | 'other' = 'footer'
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    // Create contact
    // Resend will automatically handle duplicates - if the contact already exists,
    // it will update the existing contact
    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
    });

    if ('error' in result && result.error) {
      await serverAnalytics.track('newsletter_subscribed', email, {
        email,
        subscription_source: source,
        subscription_success: false,
        error_message: result.error.message || 'Failed to add contact',
      });

      return {
        success: false,
        error: result.error.message || 'Failed to add contact',
      };
    }

    // Track successful subscription
    await serverAnalytics.track('newsletter_subscribed', email, {
      email,
      subscription_source: source,
      subscription_success: true,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await serverAnalytics.error(email, errorMessage, {
      type: 'system',
      severity: 'medium',
      code: 'NEWSLETTER_SUBSCRIPTION_ERROR',
    });

    return { success: false, error: errorMessage };
  }
}
