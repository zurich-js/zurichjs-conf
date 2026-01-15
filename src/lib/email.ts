/**
 * Email Service using Resend
 * Handles sending emails for ticket confirmations with rate limiting
 */

import * as React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { TicketPurchaseEmail } from '@/emails/templates/TicketPurchaseEmail';
import type { TicketPurchaseEmailProps } from '@/emails/templates/TicketPurchaseEmail';
import { VoucherPurchaseEmail } from '@/emails/templates/VoucherPurchaseEmail';
import type { VoucherPurchaseEmailProps } from '@/emails/templates/VoucherPurchaseEmail';
import { ReviewerInvitationEmail } from '@/emails/templates/ReviewerInvitationEmail';
import type { ReviewerInvitationEmailProps } from '@/emails/templates/ReviewerInvitationEmail';
import { SponsorshipInquiryEmail } from '@/emails/templates/SponsorshipInquiryEmail';
import type { SponsorshipInquiryEmailProps } from '@/emails/templates/SponsorshipInquiryEmail';
import { SponsorshipConfirmationEmail } from '@/emails/templates/SponsorshipConfirmationEmail';
import type { SponsorshipConfirmationEmailProps } from '@/emails/templates/SponsorshipConfirmationEmail';
import { VipUpgradeEmail } from '@/emails/templates/VipUpgradeEmail';
import type { VipUpgradeEmailProps } from '@/emails/templates/VipUpgradeEmail';
import { getFirstName } from '@/emails/utils/render';
import { getZurichJSVenueMapUrl } from '@/lib/venue';
import { getBaseUrl } from '@/lib/url';
import { serverAnalytics } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';

const log = logger.scope('Email');

/**
 * Delay utility for rate limiting
 * @param ms Milliseconds to delay
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initialize Resend client
 */
const getResendClient = (): Resend => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables');
  }

  return new Resend(apiKey);
};

/**
 * Email configuration
 */
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'ZurichJS Conference <hello@zurichjs.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'hello@zurichjs.com',
  supportEmail: 'hello@zurichjs.com',
};

/**
 * Data structure for ticket confirmation email
 */
export interface TicketConfirmationData {
  to: string;
  customerName: string;
  customerEmail: string;
  ticketType: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  conferenceDate: string;
  conferenceName: string;
  badgeLabel?: string;
  notes?: string;
  ticketId?: string; // Optional - if different from orderNumber
  qrCodeUrl?: string; // QR code URL from Supabase object storage (required for emails to work)
  pdfAttachment?: Buffer; // Optional PDF ticket attachment
  orderUrl?: string; // Optional custom order URL (uses secure token if provided)
}

/**
 * Data structure for verification request email
 */
export interface VerificationRequestData {
  to: string;
  name: string;
  verificationId: string;
  verificationType: 'student' | 'unemployed';
  // Student-specific fields
  university?: string;
  studentId?: string;
  // Unemployed-specific fields
  linkedInUrl?: string;
  ravRegistrationDate?: string;
  // Common optional field
  additionalInfo?: string;
}

/**
 * Data structure for voucher confirmation email
 */
export interface VoucherConfirmationData {
  to: string;
  firstName: string;
  amountPaid: number;
  voucherValue: number;
  currency: string;
  bonusPercent?: number;
  orderUrl?: string;
}

/**
 * Data structure for reviewer invitation email
 */
export interface ReviewerInvitationData {
  to: string;
  reviewerName?: string;
  accessLevel: 'full_access' | 'anonymous' | 'readonly';
}

/**
 * Data structure for sponsorship inquiry email
 */
export interface SponsorshipInquiryData {
  name: string;
  company: string;
  email: string;
  message: string;
  inquiryId: string;
}

/**
 * Send ticket confirmation email
 */
export async function sendTicketConfirmationEmail(
  data: TicketConfirmationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    // Use ticketId if provided, otherwise fall back to orderNumber
    const ticketIdToUse = data.ticketId || data.orderNumber;

    // Use stored QR code URL from object storage
    if (!data.qrCodeUrl) {
      log.error('QR code URL is missing for ticket', new Error('QR code URL required'), { ticketId: ticketIdToUse });
      return {
        success: false,
        error: 'QR code URL is required but was not provided',
      };
    }

    log.debug('Using QR code from object storage', { qrCodeUrl: data.qrCodeUrl });
    const qrCodeSrc = data.qrCodeUrl;

    // Map legacy data to new template format
    const emailProps: TicketPurchaseEmailProps = {
      firstName: getFirstName(data.customerName),
      fullName: data.customerName,
      email: data.customerEmail,
      eventName: data.conferenceName,
      edition: 'ZJS2026',
      tierLabel: data.ticketType,
      badgeLabel: data.badgeLabel,
      venueName: 'Technopark Zürich',
      venueAddress: 'Technoparkstrasse 1,\n8005 Zürich',
      dateLabel: data.conferenceDate,
      timeLabel: '09:00 – 17:00',
      tz: 'CEST',
      ticketId: data.orderNumber,
      qrSrc: qrCodeSrc, // QR code image URL from Supabase object storage
      qrAlt: `QR code for ticket ${data.orderNumber}`,
      logoSrc: `${getBaseUrl()}/images/logo/zurichjs-square.png`,
      logoAlt: 'ZurichJS Conference',
      // Wallet buttons disabled - not ready for integration
      // appleWalletUrl: `${getBaseUrl()}/api/wallet/apple/${ticketIdToUse}`,
      // googleWalletUrl: `${getBaseUrl()}/api/wallet/google/${ticketIdToUse}`,
      orderUrl: data.orderUrl, // Use provided secure token URL
      calendarUrl: `${getBaseUrl()}/api/calendar/${ticketIdToUse}`,
      venueMapUrl: getZurichJSVenueMapUrl(),
      refundPolicyUrl: `${getBaseUrl()}/info/refund-policy`,
      supportEmail: EMAIL_CONFIG.supportEmail,
      notes: data.notes,
    };

    log.debug('Email props prepared', { ticketId: emailProps.ticketId, to: data.to });

    // Render the email template to HTML
    const emailHtml = await render(
      React.createElement(TicketPurchaseEmail, emailProps)
    );

    // Prepare attachments
    const attachments = [];
    if (data.pdfAttachment) {
      attachments.push({
        filename: `${data.conferenceName.replace(/\s+/g, '_')}_Ticket_${ticketIdToUse}.pdf`,
        content: data.pdfAttachment,
      });
      log.debug('PDF attachment added to email');
    }

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your ${data.ticketType} ticket for ${data.conferenceName}`,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.error) {
      log.error('Error sending email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Ticket confirmation email sent successfully', { emailId: result.data?.id, to: data.to, ticketId: ticketIdToUse });
    return { success: true };
  } catch (error) {
    log.error('Error sending ticket confirmation email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

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

/**
 * Send reviewer invitation email
 */
export async function sendReviewerInvitationEmail(
  data: ReviewerInvitationData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending reviewer invitation email', {
    to: data.to,
    reviewerName: data.reviewerName || '(not provided)',
    accessLevel: data.accessLevel,
  });

  try {
    const resend = getResendClient();

    // Build the login URL - reviewers will use magic link auth
    const loginUrl = `${getBaseUrl()}/cfp/reviewer/login?email=${encodeURIComponent(data.to)}`;

    // Map data to email template props
    const emailProps: ReviewerInvitationEmailProps = {
      reviewerName: data.reviewerName,
      reviewerEmail: data.to,
      accessLevel: data.accessLevel,
      loginUrl,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    log.debug('Rendering reviewer invitation template');

    // Render the email template to HTML
    const emailHtml = await render(
      React.createElement(ReviewerInvitationEmail, emailProps)
    );
    log.debug('Email template rendered successfully');

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: 'You\'re Invited to Review CFP Submissions - ZurichJS Conference 2026',
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending reviewer invitation email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Reviewer invitation email sent successfully', { emailId: result.data?.id, to: data.to });
    return { success: true };
  } catch (error) {
    log.error('Exception sending reviewer invitation email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send verification request confirmation email
 */
export async function sendVerificationRequestEmail(
  data: VerificationRequestData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const typeLabel = data.verificationType === 'student' ? 'Student' : 'Unemployed';

    // Create a simple HTML email (you can create a React Email template later)
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Request Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #F1E271; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 28px; font-weight: bold;">ZurichJS Conference 2026</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: bold;">Verification Request Received</h2>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.name},
              </p>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for submitting your ${typeLabel} verification request for the discounted ZurichJS Conference 2026 ticket.
              </p>

              <div style="background-color: #F1E271; border-left: 4px solid #000000; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #000000; font-size: 14px; font-weight: bold;">
                  Verification ID
                </p>
                <p style="margin: 0; color: #000000; font-size: 18px; font-weight: bold; font-family: monospace;">
                  ${data.verificationId}
                </p>
              </div>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>What happens next?</strong>
              </p>

              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Our team will review your verification request within 24 hours</li>
                <li style="margin-bottom: 8px;">We may contact you to validate your student ID or unemployment documents</li>
                <li style="margin-bottom: 8px;">If approved, you'll receive an email with a secure payment link</li>
                <li style="margin-bottom: 8px;">The payment link will allow you to purchase your ticket at the discounted price</li>
                <li style="margin-bottom: 8px;">Keep your verification ID handy for reference</li>
              </ul>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                If you have any questions or haven't heard back within 24 hours, please contact us at
                <a href="mailto:hello@zurichjs.com" style="color: #000000; text-decoration: underline;">hello@zurichjs.com</a>
                and include your verification ID.
              </p>

              <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Best regards,<br>
                <strong>The ZurichJS Conference Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                ZurichJS Conference 2026
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                September 11, 2026 · Zurich, Switzerland
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Send the email to the user
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Verification Request Received - ${data.verificationId}`,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending verification email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Verification email sent successfully', { emailId: result.data?.id, to: data.to });

    // Send detailed admin notification to hello@zurichjs.com with all verification data
    try {
      const submittedAt = new Date().toLocaleString('en-CH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Zurich',
      });

      // Build details section based on verification type
      let detailsHtml = '';
      if (data.verificationType === 'student') {
        detailsHtml = `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #6b7280;">University/School:</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
              ${data.university || 'Not provided'}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #6b7280;">Student ID:</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
              ${data.studentId || 'Not provided'}
            </td>
          </tr>
        `;
      } else {
        detailsHtml = `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #6b7280;">LinkedIn Profile:</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              ${data.linkedInUrl ? `<a href="${data.linkedInUrl}" style="color: #258BCC; text-decoration: underline;">${data.linkedInUrl}</a>` : 'Not provided'}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #6b7280;">RAV Registration Date:</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
              ${data.ravRegistrationDate || 'Not provided (outside Switzerland)'}
            </td>
          </tr>
        `;
      }

      const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Verification Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #F1E271; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 24px; font-weight: bold;">New ${typeLabel} Verification Request</h1>
              <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;">Action required - Review and approve/reject</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <!-- Verification ID -->
              <div style="background-color: #000000; color: #ffffff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af;">Verification ID</p>
                <p style="margin: 0; font-size: 20px; font-weight: bold; font-family: monospace;">${data.verificationId}</p>
              </div>

              <!-- Contact Information -->
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold; border-bottom: 2px solid #F1E271; padding-bottom: 8px;">Contact Information</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
                    <strong style="color: #6b7280;">Name:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
                    ${data.name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Email:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="mailto:${data.to}" style="color: #258BCC; text-decoration: underline;">${data.to}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Type:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="background-color: ${data.verificationType === 'student' ? '#DBEAFE' : '#FEF3C7'}; color: ${data.verificationType === 'student' ? '#1E40AF' : '#92400E'}; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">
                      ${typeLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Verification Details -->
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold; border-bottom: 2px solid #F1E271; padding-bottom: 8px;">Verification Details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${detailsHtml}
              </table>

              <!-- Additional Information -->
              ${data.additionalInfo ? `
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold; border-bottom: 2px solid #F1E271; padding-bottom: 8px;">Additional Information</h2>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.additionalInfo}</p>
              </div>
              ` : ''}

              <!-- Meta Information -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; font-size: 12px; color: #6b7280;">
                <p style="margin: 0 0 4px 0;"><strong>Submitted:</strong> ${submittedAt}</p>
                <p style="margin: 0;"><strong>Reply to:</strong> <a href="mailto:${data.to}" style="color: #258BCC;">${data.to}</a></p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #111827; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated admin notification from ZurichJS Conference
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      const adminResult = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: 'hello@zurichjs.com',
        replyTo: data.to, // Reply goes to the person who submitted
        subject: `[Action Required] ${typeLabel} Verification - ${data.verificationId} - ${data.name}`,
        html: adminEmailHtml,
      });

      if (adminResult.error) {
        log.error('Error sending admin verification email', new Error(adminResult.error.message));
        // Don't fail the request if admin email fails
      } else {
        log.info('Admin verification email sent', { emailId: adminResult.data?.id });
      }
    } catch (adminError) {
      log.error('Exception sending admin verification email', adminError);
      // Don't fail the request if admin email fails
    }

    return { success: true };
  } catch (error) {
    log.error('Error sending verification request email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send multiple ticket confirmation emails with rate limiting
 * Resend allows max 2 requests/second, so we delay 600ms between each email (1.67 emails/sec)
 *
 * @param emails Array of email data to send
 * @returns Array of results for each email
 */
export async function sendTicketConfirmationEmailsQueued(
  emails: TicketConfirmationData[]
): Promise<Array<{ success: boolean; error?: string; email: string }>> {
  log.info('Starting to send emails with rate limiting', { count: emails.length });
  const results: Array<{ success: boolean; error?: string; email: string }> = [];

  for (let i = 0; i < emails.length; i++) {
    const emailData = emails[i];
    log.debug(`Sending email ${i + 1}/${emails.length}`, { to: emailData.to });

    const result = await sendTicketConfirmationEmail(emailData);
    results.push({
      ...result,
      email: emailData.to,
    });

    // Add delay between emails (except after the last one)
    if (i < emails.length - 1) {
      const delayMs = 600; // 600ms delay = 1.67 emails/second (under 2/sec limit)
      await delay(delayMs);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  log.info('Email queue completed', { successCount, failCount });

  return results;
}

/**
 * Add a contact to the newsletter
 * Uses Resend's Contacts API to add contacts to the mailing list
 * As of November 2025, contacts are global entities and don't require an audienceId
 */
export async function addNewsletterContact(
  email: string,
  source: 'footer' | 'popup' | 'checkout' | 'other' = 'footer'
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    // Create contact
    // Resend will automatically handle duplicates - if the contact already exists,
    // it will update the existing contact
    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
    });

    if ('error' in result && result.error) {
      await serverAnalytics.track('newsletter_subscribed', email, {
        email,
        subscription_source: source,
        subscription_success: false,
        error_message: result.error.message || 'Failed to add contact',
      });

      return {
        success: false,
        error: result.error.message || 'Failed to add contact',
      };
    }

    // Track successful subscription
    await serverAnalytics.track('newsletter_subscribed', email, {
      email,
      subscription_source: source,
      subscription_success: true,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await serverAnalytics.error(email, errorMessage, {
      type: 'system',
      severity: 'medium',
      code: 'NEWSLETTER_SUBSCRIPTION_ERROR',
    });

    return { success: false, error: errorMessage };
  }
}

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

/**
 * Data structure for VIP upgrade email
 */
export interface VipUpgradeEmailData {
  to: string;
  firstName: string;
  ticketId: string;
  upgradeMode: 'complimentary' | 'bank_transfer' | 'stripe';
  upgradeStatus: 'pending_payment' | 'pending_bank_transfer' | 'completed' | 'cancelled';
  amount: number | null;
  currency: string | null;
  stripePaymentUrl?: string | null;
  bankTransferReference?: string | null;
  bankTransferDueDate?: string | null;
  manageTicketUrl: string;
}

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
