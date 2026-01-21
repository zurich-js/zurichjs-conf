/**
 * Sponsorship Email Functions
 * Handles sending sponsorship inquiry emails (admin notification + confirmation)
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { SponsorshipInquiryEmail } from '@/emails/templates/SponsorshipInquiryEmail';
import type { SponsorshipInquiryEmailProps } from '@/emails/templates/SponsorshipInquiryEmail';
import { SponsorshipConfirmationEmail } from '@/emails/templates/SponsorshipConfirmationEmail';
import type { SponsorshipConfirmationEmailProps } from '@/emails/templates/SponsorshipConfirmationEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';
import type { SponsorshipInquiryData } from './types';

/**
 * Send sponsorship inquiry emails (to admin and confirmation to sender)
 */
export async function sendSponsorshipInquiryEmails(
  data: SponsorshipInquiryData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending sponsorship inquiry emails', {
    name: data.name,
    company: data.company,
    email: data.email,
    inquiryId: data.inquiryId,
  });

  try {
    const resend = getResendClient();
    const submittedAt = new Date().toLocaleString('en-CH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Zurich',
    });

    // 1. Send notification to admin (hello@zurichjs.com)
    const adminEmailProps: SponsorshipInquiryEmailProps = {
      name: data.name,
      company: data.company,
      email: data.email,
      message: data.message,
      inquiryId: data.inquiryId,
      submittedAt,
    };

    log.debug('Rendering admin notification email');
    const adminEmailHtml = await render(
      React.createElement(SponsorshipInquiryEmail, adminEmailProps)
    );

    log.debug('Sending admin notification to hello@zurichjs.com');
    const adminResult = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: 'hello@zurichjs.com',
      replyTo: data.email, // Reply goes to the person who submitted
      subject: `New Sponsorship Inquiry from ${data.company} - ${data.inquiryId}`,
      html: adminEmailHtml,
    });

    if (adminResult.error) {
      log.error('Error sending admin notification', new Error(adminResult.error.message));
      return { success: false, error: adminResult.error.message };
    }
    log.info('Admin notification sent', { emailId: adminResult.data?.id });

    // 2. Send confirmation to the person who submitted
    const confirmationEmailProps: SponsorshipConfirmationEmailProps = {
      name: data.name,
      company: data.company,
      inquiryId: data.inquiryId,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    log.debug('Rendering confirmation email');
    const confirmationEmailHtml = await render(
      React.createElement(SponsorshipConfirmationEmail, confirmationEmailProps)
    );

    log.debug('Sending confirmation email', { to: data.email });
    const confirmationResult = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Sponsorship Inquiry Received - ${data.inquiryId}`,
      html: confirmationEmailHtml,
    });

    if (confirmationResult.error) {
      log.error('Error sending confirmation', new Error(confirmationResult.error.message), { to: data.email });
      // Don't fail if confirmation fails, admin was notified
    } else {
      log.info('Confirmation email sent', { emailId: confirmationResult.data?.id, to: data.email });
    }

    log.info('Sponsorship inquiry emails complete', { inquiryId: data.inquiryId });
    return { success: true };
  } catch (error) {
    log.error('Exception sending sponsorship inquiry emails', error, { inquiryId: data.inquiryId });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
