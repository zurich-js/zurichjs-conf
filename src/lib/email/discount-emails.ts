/**
 * Discount Code Email Functions
 * Sends the popup discount code to the email that unlocked it.
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { DiscountCodeEmail } from '@/emails/templates/DiscountCodeEmail';
import type { DiscountCodeEmailProps } from '@/emails/templates/DiscountCodeEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';

export interface DiscountCodeEmailData {
  to: string;
  code: string;
  percentOff: number;
  validMinutes: number;
  expiresAtISO: string;
}

/**
 * Send the unlocked discount code by email. Non-critical: callers should not
 * block code display on this succeeding.
 */
export async function sendDiscountCodeEmail(
  data: DiscountCodeEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const emailProps: DiscountCodeEmailProps = {
      code: data.code,
      percentOff: data.percentOff,
      validMinutes: data.validMinutes,
      expiresAtISO: data.expiresAtISO,
      ticketsUrl: `${EMAIL_CONFIG.siteUrl}/#tickets`,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    const emailHtml = await render(React.createElement(DiscountCodeEmail, emailProps));

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your ${data.percentOff}% ZurichJS code — valid until ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' }).format(new Date(data.expiresAtISO))}`,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending discount code email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Discount code email sent', { emailId: result.data?.id, to: data.to });
    return { success: true };
  } catch (error) {
    log.error('Exception sending discount code email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
