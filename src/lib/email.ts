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
import { getFirstName } from '@/emails/utils/render';
import { getZurichJSVenueMapUrl } from '@/lib/venue';
import { getBaseUrl } from '@/lib/url';

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
      console.error('[Email] ❌ QR code URL is missing for ticket:', ticketIdToUse);
      return {
        success: false,
        error: 'QR code URL is required but was not provided',
      };
    }

    console.log('[Email] Using QR code from object storage:', data.qrCodeUrl);
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
      refundPolicyUrl: `${getBaseUrl()}/refund-policy`,
      supportEmail: EMAIL_CONFIG.supportEmail,
      notes: data.notes,
    };

    console.log('[Email] Email props:', emailProps);

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
      console.log('[Email] PDF attachment added to email');
    }

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your ${data.ticketType} for ${data.conferenceName}`,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.error) {
      console.error('[Email] ❌ Error sending email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[Email] ✅ Ticket confirmation email sent successfully:', result.data?.id);
    console.log('[Email] To:', data.to);
    console.log('[Email] Ticket ID:', ticketIdToUse);
    return { success: true };
  } catch (error) {
    console.error('Error sending ticket confirmation email:', error);
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
  console.log('[Email] ====== Sending voucher confirmation email ======');
  console.log('[Email] To:', data.to);
  console.log('[Email] First name:', data.firstName);
  console.log('[Email] Amount paid:', data.amountPaid, data.currency);
  console.log('[Email] Voucher value:', data.voucherValue, data.currency);
  console.log('[Email] Bonus percent:', data.bonusPercent);

  try {
    console.log('[Email] Initializing Resend client...');
    const resend = getResendClient();
    console.log('[Email] ✅ Resend client initialized');

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

    console.log('[Email] Voucher email props:', emailProps);
    console.log('[Email] Rendering email template...');

    // Render the email template to HTML
    const emailHtml = await render(
      React.createElement(VoucherPurchaseEmail, emailProps)
    );
    console.log('[Email] ✅ Email template rendered successfully');

    // Send the email
    console.log('[Email] Sending email via Resend...');
    console.log('[Email] From:', EMAIL_CONFIG.from);
    console.log('[Email] To:', data.to);
    console.log('[Email] Subject:', `Your Workshop Voucher - ${data.voucherValue} ${data.currency}`);

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your Workshop Voucher - ${data.voucherValue} ${data.currency}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('[Email] ❌ Error sending voucher email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[Email] ✅ Voucher confirmation email sent successfully!');
    console.log('[Email] Email ID:', result.data?.id);
    console.log('[Email] To:', data.to);
    console.log('[Email] Amount:', `${data.voucherValue} ${data.currency}`);
    console.log('[Email] ====== Voucher email send complete ======');
    return { success: true };
  } catch (error) {
    console.error('[Email] ❌ Exception sending voucher confirmation email:', error);
    console.error('[Email] Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[Email] Stack trace:', error instanceof Error ? error.stack : 'No stack');
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

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Verification Request Received - ${data.verificationId}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('Error sending verification email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('Verification email sent successfully:', result.data?.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification request email:', error);
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
  console.log(`[Email Queue] Starting to send ${emails.length} emails with rate limiting...`);
  const results: Array<{ success: boolean; error?: string; email: string }> = [];

  for (let i = 0; i < emails.length; i++) {
    const emailData = emails[i];
    console.log(`[Email Queue] Sending email ${i + 1}/${emails.length} to:`, emailData.to);

    const result = await sendTicketConfirmationEmail(emailData);
    results.push({
      ...result,
      email: emailData.to,
    });

    // Add delay between emails (except after the last one)
    if (i < emails.length - 1) {
      const delayMs = 600; // 600ms delay = 1.67 emails/second (under 2/sec limit)
      console.log(`[Email Queue] Waiting ${delayMs}ms before next email...`);
      await delay(delayMs);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`[Email Queue] Completed: ${successCount} sent successfully, ${failCount} failed`);

  return results;
}
