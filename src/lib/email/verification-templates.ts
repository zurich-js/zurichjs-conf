/**
 * Verification Email HTML Templates
 * Inline HTML templates for verification emails (user and admin)
 */

import type { VerificationRequestData } from './types';

/**
 * Build user verification confirmation HTML email
 */
export function buildUserVerificationHtml(data: VerificationRequestData, typeLabel: string): string {
  return `
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
}

/**
 * Build verification type-specific details HTML for admin email
 */
function buildVerificationDetailsHtml(data: VerificationRequestData): string {
  if (data.verificationType === 'student') {
    return `
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
  }

  return `
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

/**
 * Build admin verification notification HTML email
 */
export function buildAdminVerificationHtml(data: VerificationRequestData, typeLabel: string): string {
  const submittedAt = new Date().toLocaleString('en-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  });

  const detailsHtml = buildVerificationDetailsHtml(data);

  return `
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
}
