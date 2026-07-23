/**
 * Apparel Reminder Email Functions
 * Sends size-preference reminders to ticket holders with rate limiting
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { ApparelReminderEmail } from '@/emails/templates/ApparelReminderEmail';
import type { ApparelReminderEmailProps } from '@/emails/templates/ApparelReminderEmail';
import { getResendClient, EMAIL_CONFIG, delay, log } from './config';
import type { ApparelReminderData } from './types';

/**
 * Send a single apparel size reminder email
 */
export async function sendApparelReminderEmail(
  data: ApparelReminderData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const emailProps: ApparelReminderEmailProps = {
      firstName: data.firstName,
      manageTicketUrl: data.manageTicketUrl,
      isVip: data.isVip,
      missingTshirt: data.missingTshirt,
      missingHoodie: data.missingHoodie,
      customMessage: data.customMessage,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    const emailHtml = await render(React.createElement(ApparelReminderEmail, emailProps));

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: 'Quick favour: your ZurichJS Conference 2026 apparel size',
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending apparel reminder email', new Error(result.error.message), {
        to: data.to,
        ticketId: data.ticketId,
      });
      return { success: false, error: result.error.message };
    }

    log.info('Apparel reminder email sent', { emailId: result.data?.id, to: data.to, ticketId: data.ticketId });
    return { success: true };
  } catch (error) {
    log.error('Error sending apparel reminder email', error, { to: data.to, ticketId: data.ticketId });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send multiple apparel reminder emails with rate limiting
 * Resend allows max 2 requests/second, so we delay 600ms between each email (1.67 emails/sec)
 */
export async function sendApparelReminderEmailsQueued(
  emails: ApparelReminderData[]
): Promise<Array<{ success: boolean; error?: string; email: string; ticketId: string }>> {
  log.info('Starting apparel reminder email queue', { count: emails.length });
  const results: Array<{ success: boolean; error?: string; email: string; ticketId: string }> = [];

  for (let i = 0; i < emails.length; i++) {
    const emailData = emails[i];
    const result = await sendApparelReminderEmail(emailData);
    results.push({
      ...result,
      email: emailData.to,
      ticketId: emailData.ticketId,
    });

    if (i < emails.length - 1) {
      await delay(600); // 600ms delay = 1.67 emails/second (under Resend's 2/sec limit)
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  log.info('Apparel reminder email queue completed', { successCount, failCount });

  return results;
}
