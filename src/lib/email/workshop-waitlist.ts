/**
 * Workshop Waitlist
 * Waitlist signups for sold-out workshops. Mirrors the ticket waitlist flow
 * (Resend contact + confirmation email + Slack ping), with one difference:
 * contacts are created globally rather than in a dedicated audience, since
 * workshops are dynamic DB rows and can't each own an audience id. Which
 * workshop someone waitlisted for is recorded by the Slack notification.
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { serverAnalytics } from '@/lib/analytics/server';
import { WorkshopWaitlistConfirmationEmail } from '@/emails/templates/WorkshopWaitlistConfirmationEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';

/**
 * Add a workshop waitlist subscriber to Resend as a global contact.
 * Resend upserts on email, so repeat signups are harmless.
 */
export async function addWorkshopWaitlistContact(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
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
      code: 'WORKSHOP_WAITLIST_SUBSCRIPTION_ERROR',
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Send a confirmation email letting the subscriber know they're on the waitlist
 * for the given workshop.
 */
export async function sendWorkshopWaitlistConfirmationEmail(
  email: string,
  workshopTitle: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const html = await render(
      React.createElement(WorkshopWaitlistConfirmationEmail, {
        workshopTitle,
        workshopsUrl: `${EMAIL_CONFIG.siteUrl}/workshops`,
        supportEmail: EMAIL_CONFIG.supportEmail,
      })
    );

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `You're on the waitlist for ${workshopTitle} – ZurichJS Conference 2026`,
      html,
    });

    if (result.error) {
      log.error(
        'Error sending workshop waitlist confirmation email',
        new Error(result.error.message),
        { to: email, workshopTitle }
      );
      return { success: false, error: result.error.message };
    }

    log.info('Workshop waitlist confirmation email sent', {
      emailId: result.data?.id,
      to: email,
      workshopTitle,
    });
    return { success: true };
  } catch (error) {
    log.error('Exception sending workshop waitlist confirmation email', error, {
      to: email,
      workshopTitle,
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
