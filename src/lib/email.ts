/**
 * Email Service using Resend
 * Handles sending emails for ticket confirmations
 */

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { TicketConfirmationEmail } from '@/emails/TicketConfirmation';

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
  from: process.env.EMAIL_FROM || 'ZurichJS Conference <noreply@zurichjs.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@zurichjs.com',
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
}

/**
 * Send ticket confirmation email
 */
export async function sendTicketConfirmationEmail(
  data: TicketConfirmationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    // Render the email template to HTML
    const emailHtml = await render(
      TicketConfirmationEmail({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        ticketType: data.ticketType,
        orderNumber: data.orderNumber,
        amountPaid: data.amountPaid,
        currency: data.currency,
        conferenceDate: data.conferenceDate,
        conferenceName: data.conferenceName,
      })
    );

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your ticket for ${data.conferenceName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('Error sending email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('Email sent successfully:', result.data?.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending ticket confirmation email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
