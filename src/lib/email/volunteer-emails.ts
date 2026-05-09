/**
 * Volunteer Email Templates
 * Confirmation and admin notification emails for volunteer applications
 */

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
  affiliation: string | null;
  notes: string | null;
}

/**
 * Build user confirmation HTML email
 */
function buildUserConfirmationHtml(data: VolunteerApplicationEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volunteer Application Received</title>
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
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: bold;">Volunteer Application Received</h2>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.name},
              </p>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thanks for applying to volunteer as <strong>${data.roleTitle}</strong> at ZurichJS Conf 2026. We've received your application and will review it soon.
              </p>

              <div style="background-color: #F1E271; border-left: 4px solid #000000; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #000000; font-size: 14px; font-weight: bold;">
                  Application Reference
                </p>
                <p style="margin: 0; color: #000000; font-size: 18px; font-weight: bold; font-family: monospace;">
                  ${data.applicationId}
                </p>
              </div>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>What happens next?</strong>
              </p>

              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Our team will review your application</li>
                <li style="margin-bottom: 8px;">We'll be in touch via email once a decision has been made</li>
                <li style="margin-bottom: 8px;">If selected, we'll confirm your role details and next steps</li>
              </ul>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                If you have any questions, reply to this email or reach out at
                <a href="mailto:hello@zurichjs.com" style="color: #000000; text-decoration: underline;">hello@zurichjs.com</a>
                and include your application reference.
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
                September 11, 2026 &middot; Zurich, Switzerland
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
}

/**
 * Build admin notification HTML email
 */
function buildAdminNotificationHtml(data: VolunteerApplicationEmailData): string {
  const submittedAt = new Date().toLocaleString('en-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Volunteer Application</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #F1E271; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 24px; font-weight: bold;">New Volunteer Application</h1>
              <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;">Review in the admin dashboard</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <!-- Application ID -->
              <div style="background-color: #000000; color: #ffffff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af;">Application ID</p>
                <p style="margin: 0; font-size: 20px; font-weight: bold; font-family: monospace;">${data.applicationId}</p>
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
                    <a href="mailto:${data.email}" style="color: #258BCC; text-decoration: underline;">${data.email}</a>
                  </td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Phone:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
                    ${data.phone}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">LinkedIn:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="${data.linkedinUrl}" style="color: #258BCC; text-decoration: underline;">${data.linkedinUrl}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Role:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="background-color: #DBEAFE; color: #1E40AF; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">
                      ${data.roleTitle}
                    </span>
                  </td>
                </tr>
                ${data.affiliation ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Affiliation:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
                    ${data.affiliation}
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Motivation -->
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold; border-bottom: 2px solid #F1E271; padding-bottom: 8px;">Motivation</h2>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.motivation}</p>
              </div>

              <!-- Experience -->
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold; border-bottom: 2px solid #F1E271; padding-bottom: 8px;">Relevant Experience</h2>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.relevantExperience}</p>
              </div>

              <!-- Availability -->
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold; border-bottom: 2px solid #F1E271; padding-bottom: 8px;">Availability</h2>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.availability}</p>
              </div>

              ${data.notes ? `
              <!-- Notes -->
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold; border-bottom: 2px solid #F1E271; padding-bottom: 8px;">Additional Notes</h2>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.notes}</p>
              </div>
              ` : ''}

              <!-- Meta -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; font-size: 12px; color: #6b7280;">
                <p style="margin: 0 0 4px 0;"><strong>Submitted:</strong> ${submittedAt}</p>
                <p style="margin: 0;"><strong>Reply to:</strong> <a href="mailto:${data.email}" style="color: #258BCC;">${data.email}</a></p>
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

    // Send confirmation to applicant
    const userResult = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
      to: data.email,
      subject: `Volunteer Application Received - ${data.applicationId}`,
      html: buildUserConfirmationHtml(data),
    });

    if (userResult.error) {
      log.error('Error sending volunteer confirmation email', new Error(userResult.error.message), { to: data.email });
    } else {
      log.info('Volunteer confirmation email sent', { emailId: userResult.data?.id, to: data.email });
    }

    // Send admin notification to hello@zurichjs.com
    try {
      const adminResult = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: 'hello@zurichjs.com',
        replyTo: data.email,
        subject: `[Volunteer] New Application - ${data.roleTitle} - ${data.name}`,
        html: buildAdminNotificationHtml(data),
      });

      if (adminResult.error) {
        log.error('Error sending admin volunteer notification', new Error(adminResult.error.message));
      } else {
        log.info('Admin volunteer notification sent', { emailId: adminResult.data?.id });
      }
    } catch (adminError) {
      log.error('Exception sending admin volunteer notification', adminError);
    }
  } catch (error) {
    log.error('Failed to send volunteer emails', error instanceof Error ? error : null, {
      email: data.email,
    });
    throw error;
  }
}
