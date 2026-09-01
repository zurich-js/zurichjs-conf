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
import { getResendClient, EMAIL_CONFIG, log } from './config';
import { ErrorCodes, ExternalServiceError } from '@/lib/errors';
import { retry } from '@/lib/retry';
import type { TicketConfirmationData } from './types';

/** Resend surfaces rate limits as a result error, not a throw. */
function isResendRateLimit(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.name === 'rate_limit_exceeded' || /rate.?limit|too many requests/i.test(error.message ?? '');
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
    const attachments: Array<{ filename: string; content: Buffer }> = [];
    if (data.pdfAttachment) {
      attachments.push({
        filename: `${data.conferenceName.replace(/\s+/g, '_')}_Ticket_${ticketIdToUse}.pdf`,
        content: data.pdfAttachment,
      });
      log.debug('PDF attachment added to email');
    }

    // Send the email. Rate limits (2 req/s account-wide) are retried with
    // backoff instead of pre-emptively slept around — the webhook used to
    // spend 600ms per attendee sleeping, which timed out multi-seat orders.
    const result = await retry(
      async () => {
        const sendResult = await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: data.to,
          replyTo: EMAIL_CONFIG.replyTo,
          subject: `Your ${data.ticketType} ticket for ${data.conferenceName}`,
          html: emailHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        if (sendResult.error && isResendRateLimit(sendResult.error)) {
          throw new ExternalServiceError('Resend rate limited', {
            cause: sendResult.error,
            code: ErrorCodes.RATE_LIMITED,
          });
        }
        return sendResult;
      },
      {
        attempts: 4,
        baseDelayMs: 700,
        shouldRetry: (err) => err instanceof ExternalServiceError,
        label: 'resend-ticket-email',
      }
    );

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
 * Send multiple ticket confirmation emails serially.
 *
 * Rate limiting is reactive: each send retries with backoff on Resend 429s
 * (see `sendTicketConfirmationEmail`) instead of a fixed inter-email sleep —
 * a 10-seat order used to spend ~5.4s asleep inside the Stripe webhook.
 *
 * @param emails Array of email data to send
 * @returns Per-email results, carrying `ticketId` so callers can record which
 *          tickets were actually emailed (webhook retries resend the rest).
 */
export async function sendTicketConfirmationEmailsQueued(
  emails: TicketConfirmationData[]
): Promise<Array<{ success: boolean; error?: string; email: string; ticketId?: string }>> {
  log.info('Starting to send emails', { count: emails.length });
  const results: Array<{ success: boolean; error?: string; email: string; ticketId?: string }> = [];

  for (let i = 0; i < emails.length; i++) {
    const emailData = emails[i];
    log.debug(`Sending email ${i + 1}/${emails.length}`, { to: emailData.to });

    const result = await sendTicketConfirmationEmail(emailData);
    results.push({
      ...result,
      email: emailData.to,
      ticketId: emailData.ticketId,
    });
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  log.info('Email queue completed', { successCount, failCount });

  return results;
}
