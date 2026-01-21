/**
 * Voucher Email Functions
 * Handles sending voucher confirmation emails
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { VoucherPurchaseEmail } from '@/emails/templates/VoucherPurchaseEmail';
import type { VoucherPurchaseEmailProps } from '@/emails/templates/VoucherPurchaseEmail';
import { getBaseUrl } from '@/lib/url';
import { getResendClient, EMAIL_CONFIG, log } from './config';
import type { VoucherConfirmationData } from './types';

/**
 * Send voucher confirmation email
 */
export async function sendVoucherConfirmationEmail(
  data: VoucherConfirmationData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending voucher confirmation email', {
    to: data.to,
    firstName: data.firstName,
    amountPaid: data.amountPaid,
    voucherValue: data.voucherValue,
    currency: data.currency,
    bonusPercent: data.bonusPercent,
  });

  try {
    const resend = getResendClient();

    // Map data to email template props
    const emailProps: VoucherPurchaseEmailProps = {
      firstName: data.firstName,
      amountPaid: data.amountPaid,
      voucherValue: data.voucherValue,
      currency: data.currency,
      bonusPercent: data.bonusPercent,
      orderUrl: data.orderUrl,
      supportEmail: EMAIL_CONFIG.supportEmail,
      workshopsUrl: `${getBaseUrl()}/workshops`,
    };

    log.debug('Voucher email props prepared', { voucherValue: emailProps.voucherValue });

    // Render the email template to HTML
    const emailHtml = await render(
      React.createElement(VoucherPurchaseEmail, emailProps)
    );
    log.debug('Email template rendered successfully');

    // Send the email
    log.debug('Sending email via Resend', { to: data.to });

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your Workshop Voucher - ${data.voucherValue} ${data.currency}`,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending voucher email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Voucher confirmation email sent successfully', {
      emailId: result.data?.id,
      to: data.to,
      voucherValue: data.voucherValue,
      currency: data.currency,
    });
    return { success: true };
  } catch (error) {
    log.error('Exception sending voucher confirmation email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
