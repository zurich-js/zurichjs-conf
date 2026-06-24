/**
 * Ticket Waitlist
 * Manages per-type Resend audiences for sold-out ticket waitlist subscribers.
 * Each waitlist type (student/unemployed, VIP) maps to its own Resend audience.
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { serverAnalytics } from '@/lib/analytics/server';
import { TicketWaitlistConfirmationEmail } from '@/emails/templates/TicketWaitlistConfirmationEmail';
import { getBaseUrl } from '@/lib/url';
import { getResendClient, EMAIL_CONFIG, log } from './config';

/**
 * Ticket waitlist types. Each maps to a dedicated Resend audience.
 */
export type TicketWaitlistType = 'student' | 'vip';

const AUDIENCE_ENV_VARS: Record<TicketWaitlistType, string> = {
  student: 'RESEND_STUDENT_WAITLIST_AUDIENCE_ID',
  vip: 'RESEND_VIP_WAITLIST_AUDIENCE_ID',
};

/**
 * Human-readable label per waitlist type, used in email copy/subject.
 */
const WAITLIST_LABELS: Record<TicketWaitlistType, string> = {
  student: 'Student/Unemployed',
  vip: 'VIP',
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

/**
 * Send a confirmation email letting the subscriber know they're on the waitlist
 * for the given ticket type.
 */
export async function sendTicketWaitlistConfirmationEmail(
  email: string,
  type: TicketWaitlistType
): Promise<{ success: boolean; error?: string }> {
  const ticketTypeLabel = WAITLIST_LABELS[type];

  try {
    const resend = getResendClient();

    const html = await render(
      React.createElement(TicketWaitlistConfirmationEmail, {
        ticketTypeLabel,
        tripCostUrl: `${getBaseUrl()}/trip-cost`,
        showStandardUpgradePath: type === 'vip',
        supportEmail: EMAIL_CONFIG.supportEmail,
      })
    );

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `You're on the ${ticketTypeLabel} waitlist – ZurichJS Conference 2026`,
      html,
    });

    if (result.error) {
      log.error('Error sending waitlist confirmation email', new Error(result.error.message), {
        to: email,
        waitlistType: type,
      });
      return { success: false, error: result.error.message };
    }

    log.info('Waitlist confirmation email sent', { emailId: result.data?.id, to: email, waitlistType: type });
    return { success: true };
  } catch (error) {
    log.error('Exception sending waitlist confirmation email', error, { to: email, waitlistType: type });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
