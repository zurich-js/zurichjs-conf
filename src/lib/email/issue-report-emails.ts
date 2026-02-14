/**
 * Issue Report Email Functions
 * Handles sending issue report notification emails to organizers
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { IssueReportEmail } from '@/emails/templates/IssueReportEmail';
import type { IssueReportEmailProps } from '@/emails/templates/IssueReportEmail';
import { getResendClient, EMAIL_CONFIG, log } from './config';
import type { IssueReportData } from './types';
import { getIssueTypeLabel } from '@/lib/validations/issue-report';

/**
 * Send issue report notification email to organizers
 * Note: No confirmation email is sent to the reporter - rewards are issued manually
 */
export async function sendIssueReportEmail(
  data: IssueReportData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending issue report email', {
    reportId: data.reportId,
    issueType: data.issueType,
    pageUrl: data.pageUrl,
  });

  try {
    const resend = getResendClient();

    // Build email props
    const emailProps: IssueReportEmailProps = {
      reportId: data.reportId,
      name: data.name,
      email: data.email,
      issueType: data.issueType,
      pageUrl: data.pageUrl,
      description: data.description,
      screenshotUrl: data.screenshotUrl,
      userAgent: data.userAgent,
      submittedAt: data.submittedAt,
      posthogSessionId: data.posthogSessionId,
      posthogDistinctId: data.posthogDistinctId,
    };

    // Render email HTML
    log.debug('Rendering issue report email');
    const emailHtml = await render(
      React.createElement(IssueReportEmail, emailProps)
    );

    // Format subject line with issue type and page path
    const issueTypeLabel = getIssueTypeLabel(data.issueType);
    const pagePath = (() => {
      if (!data.pageUrl) return 'the website';
      try {
        const url = new URL(data.pageUrl);
        return `${url.host}${url.pathname}`;
      } catch {
        return data.pageUrl;
      }
    })();
    const subject = `[Issue Report] ${issueTypeLabel} on ${pagePath}`;

    // Send to organizers
    log.debug('Sending issue report email to organizers');
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: 'hello@zurichjs.com',
      replyTo: data.email,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Error sending issue report email', new Error(result.error.message), {
        reportId: data.reportId,
      });
      return { success: false, error: result.error.message };
    }

    log.info('Issue report email sent successfully', {
      reportId: data.reportId,
      emailId: result.data?.id,
    });

    return { success: true };
  } catch (error) {
    log.error('Exception sending issue report email', error, {
      reportId: data.reportId,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
