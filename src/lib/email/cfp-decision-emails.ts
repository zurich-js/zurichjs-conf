/**
 * CFP Decision Email Functions
 * Handles sending acceptance and rejection emails to speakers
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { CfpAcceptanceEmail } from '@/emails/templates/CfpAcceptanceEmail';
import { CfpRejectionEmail } from '@/emails/templates/CfpRejectionEmail';
import type { CfpAcceptanceEmailData, CfpRejectionEmailData } from '@/lib/types/cfp/decisions';
import { getResendClient, EMAIL_CONFIG, log } from './config';

/**
 * Result of sending an email
 */
interface SendEmailResult {
  success: boolean;
  email_id?: string;
  error?: string;
}

/**
 * Send acceptance email to speaker
 * Includes link to speaker portal for confirmation
 */
export async function sendCfpAcceptanceEmail(
  data: CfpAcceptanceEmailData
): Promise<SendEmailResult> {
  log.info('Sending CFP acceptance email', {
    to: data.to,
    talk_title: data.talk_title,
  });

  try {
    const resend = getResendClient();

    // Render email HTML
    log.debug('Rendering CFP acceptance email');
    const emailHtml = await render(
      React.createElement(CfpAcceptanceEmail, data)
    );

    // Format subject line
    const subject = `Congratulations! Your talk "${data.talk_title}" has been accepted to ${data.conference_name}`;

    // Send email
    log.debug('Sending CFP acceptance email via Resend');
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending CFP acceptance email', new Error(result.error.message), {
        to: data.to,
      });
      return { success: false, error: result.error.message };
    }

    log.info('CFP acceptance email sent successfully', {
      to: data.to,
      email_id: result.data?.id,
    });

    return { success: true, email_id: result.data?.id };
  } catch (error) {
    log.error('Exception sending CFP acceptance email', error, {
      to: data.to,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send rejection email to speaker
 * Optionally includes a discount coupon code
 */
export async function sendCfpRejectionEmail(
  data: CfpRejectionEmailData
): Promise<SendEmailResult> {
  log.info('Sending CFP rejection email', {
    to: data.to,
    talk_title: data.talk_title,
    has_coupon: !!data.coupon_code,
  });

  try {
    const resend = getResendClient();

    // Render email HTML
    log.debug('Rendering CFP rejection email');
    const emailHtml = await render(
      React.createElement(CfpRejectionEmail, data)
    );

    // Format subject line
    const subject = `Update on your ${data.conference_name} submission`;

    // Send email
    log.debug('Sending CFP rejection email via Resend');
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending CFP rejection email', new Error(result.error.message), {
        to: data.to,
      });
      return { success: false, error: result.error.message };
    }

    log.info('CFP rejection email sent successfully', {
      to: data.to,
      email_id: result.data?.id,
    });

    return { success: true, email_id: result.data?.id };
  } catch (error) {
    log.error('Exception sending CFP rejection email', error, {
      to: data.to,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
