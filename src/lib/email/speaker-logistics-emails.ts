/**
 * Speaker Logistics Request Email Functions
 * Sends speakers their unique event-logistics form link with rate limiting
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { SpeakerLogisticsRequestEmail } from '@/emails/templates/SpeakerLogisticsRequestEmail';
import type { SpeakerLogisticsRequestEmailProps } from '@/emails/templates/SpeakerLogisticsRequestEmail';
import { getResendClient, EMAIL_CONFIG, delay, log } from './config';
import type { SpeakerLogisticsRequestData } from './types';

/**
 * Send a single speaker logistics request email
 */
export async function sendSpeakerLogisticsRequestEmail(
  data: SpeakerLogisticsRequestData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const emailProps: SpeakerLogisticsRequestEmailProps = {
      firstName: data.firstName,
      logisticsUrl: data.logisticsUrl,
      hasSubmitted: data.hasSubmitted,
      customMessage: data.customMessage,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    const emailHtml = await render(React.createElement(SpeakerLogisticsRequestEmail, emailProps));

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: data.hasSubmitted
        ? 'Please review your ZurichJS speaker week plans'
        : 'Your ZurichJS speaker week — which events will you join?',
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending speaker logistics request email', new Error(result.error.message), {
        to: data.to,
        speakerId: data.speakerId,
      });
      return { success: false, error: result.error.message };
    }

    log.info('Speaker logistics request email sent', {
      emailId: result.data?.id,
      to: data.to,
      speakerId: data.speakerId,
    });
    return { success: true };
  } catch (error) {
    log.error('Error sending speaker logistics request email', error, {
      to: data.to,
      speakerId: data.speakerId,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send multiple speaker logistics request emails with rate limiting
 * Resend allows max 2 requests/second, so we delay 600ms between each email (1.67 emails/sec)
 */
export async function sendSpeakerLogisticsRequestEmailsQueued(
  emails: SpeakerLogisticsRequestData[]
): Promise<Array<{ success: boolean; error?: string; email: string; speakerId: string }>> {
  log.info('Starting speaker logistics request email queue', { count: emails.length });
  const results: Array<{ success: boolean; error?: string; email: string; speakerId: string }> = [];

  for (let i = 0; i < emails.length; i++) {
    const emailData = emails[i];
    const result = await sendSpeakerLogisticsRequestEmail(emailData);
    results.push({
      ...result,
      email: emailData.to,
      speakerId: emailData.speakerId,
    });

    if (i < emails.length - 1) {
      await delay(600); // 600ms delay = 1.67 emails/second (under Resend's 2/sec limit)
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  log.info('Speaker logistics request email queue completed', { successCount, failCount });

  return results;
}
