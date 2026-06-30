import * as React from 'react';
import { render } from '@react-email/render';
import {
  NamespaceStudentSponsorshipEmail,
  type NamespaceStudentSponsorshipEmailProps,
} from '@/emails/templates/NamespaceStudentSponsorshipEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';

export const NAMESPACE_STUDENT_SPONSORSHIP_TO =
  process.env.NAMESPACE_STUDENT_SPONSORSHIP_TO || 'bogdan@zurichjs.com';
export const NAMESPACE_STUDENT_SPONSORSHIP_BCC = 'hello@zurichjs.com';

export type NamespaceStudentSponsorshipEmailData =
  NamespaceStudentSponsorshipEmailProps;

export async function sendNamespaceStudentSponsorshipEmail(
  data: NamespaceStudentSponsorshipEmailData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending Namespace student sponsorship email', {
    submissionId: data.submissionId,
  });

  try {
    const resend = getResendClient();
    const html = await render(
      React.createElement(NamespaceStudentSponsorshipEmail, data)
    );

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: NAMESPACE_STUDENT_SPONSORSHIP_TO,
      bcc: NAMESPACE_STUDENT_SPONSORSHIP_BCC,
      replyTo: data.email,
      subject: `[Namespace Student Sponsorship] ${data.fullName}`,
      html,
      text: buildPlainTextEmail(data),
    });

    if (result.error) {
      log.error(
        'Error sending Namespace student sponsorship email',
        new Error(result.error.message),
        { submissionId: data.submissionId }
      );
      return { success: false, error: result.error.message };
    }

    log.info('Namespace student sponsorship email sent', {
      submissionId: data.submissionId,
      emailId: result.data?.id,
    });

    return { success: true };
  } catch (error) {
    log.error('Exception sending Namespace student sponsorship email', error, {
      submissionId: data.submissionId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildPlainTextEmail(data: NamespaceStudentSponsorshipEmailData): string {
  return [
    'Namespace Student Sponsorship submission',
    '',
    `Submission ID: ${data.submissionId}`,
    `Submitted: ${data.submittedAt}`,
    '',
    `Name: ${data.fullName}`,
    `Email: ${data.email}`,
    `University: ${data.universityName}`,
    `Degree: ${data.degreeName}`,
    `GitHub: ${data.githubUrl}`,
    '',
    `Code link: ${data.codeUrl}`,
    '',
    'Setup instructions:',
    data.setupInstructions,
    '',
    'Why they are proud of it:',
    data.prideExplanation,
    '',
    data.anythingElse ? `Anything else:\n${data.anythingElse}\n` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
