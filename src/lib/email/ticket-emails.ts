/**
 * Ticket Email Functions
 * Handles sending ticket confirmation emails with rate limiting
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { TicketPurchaseEmail } from '@/emails/templates/TicketPurchaseEmail';
import type { TicketPurchaseEmailProps } from '@/emails/templates/TicketPurchaseEmail';
import { getFirstName } from '@/emails/utils/render';
import { getZurichJSVenueMapUrl } from '@/lib/venue';
import { getBaseUrl } from '@/lib/url';
import { getResendClient, EMAIL_CONFIG, delay, log } from './config';
import type { TicketConfirmationData } from './types';

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
