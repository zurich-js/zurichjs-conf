/**
 * Contact Message Email Functions
 * Handles sending contact form notification emails to organizers
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { ContactMessageEmail } from '@/emails/templates/ContactMessageEmail';
import type { ContactMessageEmailProps } from '@/emails/templates/ContactMessageEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';
import type { ContactMessageData } from './types';
import { getContactTypeLabel } from '@/lib/validations/contact';

/**
 * Send contact message notification email to organizers
 * Reply-to is set to the sender so the team can respond directly.
 */
export async function sendContactMessageEmail(
  data: ContactMessageData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending contact message email', {
    messageId: data.messageId,
    contactType: data.contactType,
  });

  try {
    const resend = getResendClient();

    const emailProps: ContactMessageEmailProps = {
      messageId: data.messageId,
      name: data.name,
      email: data.email,
      contactType: data.contactType,
      message: data.message,
      userAgent: data.userAgent,
      submittedAt: data.submittedAt,
      posthogSessionId: data.posthogSessionId,
      posthogDistinctId: data.posthogDistinctId,
    };

    log.debug('Rendering contact message email');
    const emailHtml = await render(
      React.createElement(ContactMessageEmail, emailProps)
    );

    const contactTypeLabel = getContactTypeLabel(data.contactType);
    const subject = `[Contact] ${contactTypeLabel} from ${data.name}`;

    log.debug('Sending contact message email to organizers');
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.supportEmail,
      replyTo: data.email,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending contact message email', new Error(result.error.message), {
        messageId: data.messageId,
      });
      return { success: false, error: result.error.message };
    }

    log.info('Contact message email sent successfully', {
      messageId: data.messageId,
      emailId: result.data?.id,
    });

    return { success: true };
  } catch (error) {
    log.error('Exception sending contact message email', error, {
      messageId: data.messageId,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
