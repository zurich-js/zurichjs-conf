/**
 * CFP Email Functions
 * Handles sending reviewer invitation and feedback request emails
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { ReviewerInvitationEmail } from '@/emails/templates/ReviewerInvitationEmail';
import type { ReviewerInvitationEmailProps } from '@/emails/templates/ReviewerInvitationEmail';
import { CfpFeedbackRequestEmail } from '@/emails/templates/CfpFeedbackRequestEmail';
import { getBaseUrl } from '@/lib/url';
import { getResendClient, EMAIL_CONFIG, log } from './config';
import type { ReviewerInvitationData, CfpFeedbackRequestData } from './types';

/**
 * Send reviewer invitation email
 */
export async function sendReviewerInvitationEmail(
  data: ReviewerInvitationData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending reviewer invitation email', {
    to: data.to,
    reviewerName: data.reviewerName || '(not provided)',
    accessLevel: data.accessLevel,
  });

  try {
    const resend = getResendClient();

    // Build the login URL - reviewers will use magic link auth
    const loginUrl = `${getBaseUrl()}/cfp/reviewer/login?email=${encodeURIComponent(data.to)}`;

    // Map data to email template props
    const emailProps: ReviewerInvitationEmailProps = {
      reviewerName: data.reviewerName,
      reviewerEmail: data.to,
      accessLevel: data.accessLevel,
      loginUrl,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    log.debug('Rendering reviewer invitation template');

    // Render the email template to HTML
    const emailHtml = await render(
      React.createElement(ReviewerInvitationEmail, emailProps)
    );
    log.debug('Email template rendered successfully');

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: 'You\'re Invited to Review CFP Submissions - ZurichJS Conference 2026',
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending reviewer invitation email', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Reviewer invitation email sent successfully', { emailId: result.data?.id, to: data.to });
    return { success: true };
  } catch (error) {
    log.error('Exception sending reviewer invitation email', error, { to: data.to });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send feedback request email to organizers
 * Reply-to is set to the speaker's email so organizers can reply directly
 */
export async function sendCfpFeedbackRequestEmail(
  data: CfpFeedbackRequestData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending CFP feedback request email', {
    speakerName: data.speakerName,
    speakerEmail: data.speakerEmail,
    talkTitle: data.talkTitle,
  });

  try {
    const resend = getResendClient();

    const emailHtml = await render(
      React.createElement(CfpFeedbackRequestEmail, {
        speakerName: data.speakerName,
        speakerEmail: data.speakerEmail,
        talkTitle: data.talkTitle,
        submissionType: data.submissionType,
        submittedAt: data.submittedAt,
      })
    );

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.supportEmail,
      replyTo: data.speakerEmail,
      subject: `Feedback requested: "${data.talkTitle}" by ${data.speakerName}`,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending feedback request email', new Error(result.error.message));
      return { success: false, error: result.error.message };
    }

    log.info('Feedback request email sent', { emailId: result.data?.id });
    return { success: true };
  } catch (error) {
    log.error('Exception sending feedback request email', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
