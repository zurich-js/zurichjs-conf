/**
 * Workshop Email Functions
 * Handles sending workshop seat confirmation emails.
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { WorkshopPurchaseEmail } from '@/emails/templates/WorkshopPurchaseEmail';
import type { WorkshopPurchaseEmailProps } from '@/emails/templates/WorkshopPurchaseEmail';
import { getBaseUrl } from '@/lib/url';
import { getResendClient, EMAIL_CONFIG, log } from './config';

export interface WorkshopConfirmationData {
  to: string;
  firstName: string;
  workshopTitle: string;
  workshopDescription?: string | null;
  instructorName?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  amountPaid: number;
  currency: string;
  seatIndex: number;
  totalSeats: number;
  workshopSlug?: string | null;
  calendarUrl?: string | null;
}

export async function sendWorkshopConfirmationEmail(
  data: WorkshopConfirmationData
): Promise<{ success: boolean; error?: string }> {
  const seatLabel =
    data.totalSeats > 1 ? `Seat ${data.seatIndex + 1} of ${data.totalSeats}` : null;

  log.info('Sending workshop confirmation email', {
    to: data.to,
    workshopTitle: data.workshopTitle,
    seatIndex: data.seatIndex,
    totalSeats: data.totalSeats,
  });

  try {
    const resend = getResendClient();

    const emailProps: WorkshopPurchaseEmailProps = {
      firstName: data.firstName,
      workshopTitle: data.workshopTitle,
      workshopDescription: data.workshopDescription,
      instructorName: data.instructorName,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      room: data.room,
      amountPaid: data.amountPaid,
      currency: data.currency,
      seatLabel,
      workshopUrl: data.workshopSlug ? `${getBaseUrl()}/workshops/${data.workshopSlug}` : undefined,
      calendarUrl: data.calendarUrl ?? undefined,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    const emailHtml = await render(React.createElement(WorkshopPurchaseEmail, emailProps));

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your workshop seat — ${data.workshopTitle}`,
      html: emailHtml,
    });

    if (result.error) {
      log.error(
        'Error sending workshop confirmation email',
        new Error(result.error.message),
        { to: data.to }
      );
      return { success: false, error: result.error.message };
    }

    log.info('Workshop confirmation email sent', {
      emailId: result.data?.id,
      to: data.to,
      workshopTitle: data.workshopTitle,
    });
    return { success: true };
  } catch (error) {
    log.error('Exception sending workshop confirmation email', error, { to: data.to });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
