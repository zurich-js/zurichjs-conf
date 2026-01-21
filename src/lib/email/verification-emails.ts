/**
 * Verification Email Functions
 * Handles sending verification request confirmation emails (student/unemployed)
 */

import { getResendClient, EMAIL_CONFIG, log } from './config';
import type { VerificationRequestData } from './types';
import { buildUserVerificationHtml, buildAdminVerificationHtml } from './verification-templates';

/**
 * Send verification request confirmation email
 */
export async function sendVerificationRequestEmail(
  data: VerificationRequestData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const typeLabel = data.verificationType === 'student' ? 'Student' : 'Unemployed';

    // Build user confirmation email HTML
    const emailHtml = buildUserVerificationHtml(data, typeLabel);

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
      const adminEmailHtml = buildAdminVerificationHtml(data, typeLabel);

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
