/**
 * Verification Approval Email Functions
 * Sends approval email with payment link to verified students/unemployed users
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { VerificationApprovalEmail } from '@/emails/templates/VerificationApprovalEmail';
import type { VerificationApprovalEmailProps } from '@/emails/templates/VerificationApprovalEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';

export interface VerificationApprovalEmailData {
  to: string;
  firstName: string;
  verificationType: 'student' | 'unemployed';
  verificationId: string;
  paymentLinkUrl: string;
}

/**
 * Send verification approval email with payment link
 */
export async function sendVerificationApprovalEmail(
  data: VerificationApprovalEmailData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending verification approval email', {
    to: data.to,
    firstName: data.firstName,
    verificationType: data.verificationType,
  });

  try {
    const resend = getResendClient();
    const typeLabel = data.verificationType === 'student' ? 'Student' : 'Unemployed';

    const emailProps: VerificationApprovalEmailProps = {
      firstName: data.firstName,
      verificationType: data.verificationType,
      verificationId: data.verificationId,
      paymentLinkUrl: data.paymentLinkUrl,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    log.debug('Rendering verification approval email template');

    const emailHtml = await render(
      React.createElement(VerificationApprovalEmail, emailProps)
    );

    const subject = `Your ${typeLabel} Verification is Approved - ZurichJS Conference 2026`;

    log.debug('Sending email via Resend', { to: data.to, subject });

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending verification approval email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Verification approval email sent successfully', { emailId: result.data?.id, to: data.to });
    return { success: true };
  } catch (error) {
    log.error('Exception sending verification approval email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
