/**
 * VIP Upgrade Email Functions
 * Handles sending VIP upgrade notification emails
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { VipUpgradeEmail } from '@/emails/templates/VipUpgradeEmail';
import type { VipUpgradeEmailProps } from '@/emails/templates/VipUpgradeEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';
import type { VipUpgradeEmailData } from './types';

/**
 * Send VIP upgrade email to attendee
 */
export async function sendVipUpgradeEmail(
  data: VipUpgradeEmailData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending VIP upgrade email', {
    to: data.to,
    firstName: data.firstName,
    upgradeMode: data.upgradeMode,
    upgradeStatus: data.upgradeStatus,
  });

  try {
    const resend = getResendClient();

    // Map data to email template props
    const emailProps: VipUpgradeEmailProps = {
      firstName: data.firstName,
      ticketId: data.ticketId,
      upgradeMode: data.upgradeMode,
      upgradeStatus: data.upgradeStatus,
      amount: data.amount,
      currency: data.currency,
      stripePaymentUrl: data.stripePaymentUrl,
      bankTransferReference: data.bankTransferReference,
      bankTransferDueDate: data.bankTransferDueDate,
      manageTicketUrl: data.manageTicketUrl,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    log.debug('Rendering VIP upgrade email template');

    // Render the email template to HTML
    const emailHtml = await render(
      React.createElement(VipUpgradeEmail, emailProps)
    );
    log.debug('Email template rendered successfully');

    // Determine subject based on status
    const subject = data.upgradeStatus === 'completed'
      ? "You're upgraded to VIP, ZurichJS Conf"
      : 'Complete your VIP upgrade - ZurichJS Conf';

    // Send the email
    log.debug('Sending email via Resend', { to: data.to, subject });

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending VIP upgrade email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('VIP upgrade email sent successfully', { emailId: result.data?.id, to: data.to });
    return { success: true };
  } catch (error) {
    log.error('Exception sending VIP upgrade email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
