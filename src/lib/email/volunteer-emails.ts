/**
 * Volunteer Email Functions
 * Confirmation and admin notification emails for volunteer applications
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { VolunteerApplicationConfirmationEmail } from '@/emails/templates/VolunteerApplicationConfirmationEmail';
import { VolunteerApplicationAdminEmail } from '@/emails/templates/VolunteerApplicationAdminEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';

interface VolunteerApplicationEmailData {
  name: string;
  email: string;
  applicationId: string;
  roleTitle: string;
  phone: string | null;
  linkedinUrl: string;
  motivation: string;
  availability: string;
  relevantExperience: string;
  location: string;
  affiliation: string | null;
  notes: string | null;
}

/**
 * Send volunteer application confirmation email to applicant
 * and admin notification email to hello@zurichjs.com
 */
export async function sendVolunteerApplicationConfirmationEmail(
  data: VolunteerApplicationEmailData,
): Promise<void> {
  try {
    const resend = getResendClient();

    const userHtml = await render(
      React.createElement(VolunteerApplicationConfirmationEmail, {
        name: data.name,
        roleTitle: data.roleTitle,
        applicationId: data.applicationId,
        supportEmail: EMAIL_CONFIG.supportEmail,
      }),
    );

    // Send confirmation to applicant
    const userResult = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
      to: data.email,
      subject: `Volunteer Application Received - ${data.applicationId}`,
      html: userHtml,
    });

    if (userResult.error) {
      log.error('Error sending volunteer confirmation email', new Error(userResult.error.message), { to: data.email });
    } else {
      log.info('Volunteer confirmation email sent', { emailId: userResult.data?.id, to: data.email });
    }

    // Send admin notification to hello@zurichjs.com
    try {
      const submittedAt = new Date().toLocaleString('en-CH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Zurich',
      });

      const adminHtml = await render(
        React.createElement(VolunteerApplicationAdminEmail, {
          applicationId: data.applicationId,
          name: data.name,
          email: data.email,
          roleTitle: data.roleTitle,
          phone: data.phone,
          linkedinUrl: data.linkedinUrl,
          location: data.location,
          affiliation: data.affiliation,
          motivation: data.motivation,
          relevantExperience: data.relevantExperience,
          availability: data.availability,
          notes: data.notes,
          submittedAt,
        }),
      );

      const adminResult = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: 'hello@zurichjs.com',
        replyTo: data.email,
        subject: `[Volunteer] New Application - ${data.roleTitle} - ${data.name}`,
        html: adminHtml,
      });

      if (adminResult.error) {
        log.error('Error sending admin volunteer notification', new Error(adminResult.error.message));
      } else {
        log.info('Admin volunteer notification sent', { emailId: adminResult.data?.id });
      }
    } catch (adminError) {
      log.error('Exception sending admin volunteer notification', adminError instanceof Error ? adminError : null);
    }
  } catch (error) {
    log.error('Failed to send volunteer emails', error instanceof Error ? error : null, {
      email: data.email,
    });
    throw error;
  }
}
