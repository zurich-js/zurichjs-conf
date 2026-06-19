/**
 * Team Request API Endpoint
 * Handles team package inquiries and sends emails
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import type { TeamRequestData } from '@/components/molecules';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';

const log = logger.scope('Team Request API');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailSafely(
  label: string,
  payload: Parameters<typeof resend.emails.send>[0]
) {
  try {
    const result = await resend.emails.send(payload);
    if (result.error) {
      log.error(`Failed to send ${label} email`, result.error);
    }
    return result;
  } catch (error) {
    log.error(`Failed to send ${label} email`, error);
    return null;
  }
}

function buildReplyHref(email: string) {
  const params = new URLSearchParams({
    subject: 'Re: Team Package for ZurichJS Conference 2026',
    cc: 'hello@zurichjs.com',
  });

  return `mailto:${encodeURIComponent(email)}?${params.toString()}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

interface TeamRequestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamRequestResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { name, email, company, ticketType, quantity, message } = req.body as TeamRequestData;

    // Validate required fields
    if (!name || !email || !company || !ticketType || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      log.error('RESEND_API_KEY is not configured');
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
      });
    }

    // Get base URL for email links
    const baseUrl = getBaseUrl(req);
    const replyHref = buildReplyHref(email);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCompany = escapeHtml(company);
    const safeTicketType = escapeHtml(ticketType);
    const safeQuantity = escapeHtml(quantity);
    const safeMessage = message ? escapeHtml(message) : '';

    // Capture the lead before any external email provider work. This gives us
    // a recovery trail even when Resend rejects one of the notifications.
    try {
      await serverAnalytics.identify(email, {
        email,
        name,
        company,
      });
      await serverAnalytics.track('form_submitted', email, {
        form_name: 'team_request',
        form_type: 'other',
        form_success: true,
      });
    } catch (analyticsError) {
      log.error('Failed to capture team request analytics', analyticsError);
    }

    // Send confirmation email to customer
    await sendEmailSafely('team request customer confirmation', {
      from: 'ZurichJS Conference <hello@zurichjs.com>',
      to: email,
      subject: 'Team Package Request Received - ZurichJS Conference 2026',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1a1a1a; color: #ffd700; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e0e0e0; border-top: none; }
              .details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
              .details-row:last-child { border-bottom: none; }
              .label { font-weight: 600; color: #555; }
              .value { color: #333; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #ffd700; color: #1a1a1a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Team Request Received!</h1>
              </div>
              <div class="content">
                <p>Hi ${safeName},</p>
                <p>Thank you for your interest in our team packages for <strong>ZurichJS Conference 2026</strong>!</p>
                <p>We've received your request and our team will review it shortly. Here's what you requested:</p>

                <div class="details">
                  <div class="details-row">
                    <span class="label">Ticket Type:</span>
                    <span class="value">${safeTicketType}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Quantity:</span>
                    <span class="value">${safeQuantity} tickets</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Company:</span>
                    <span class="value">${safeCompany}</span>
                  </div>
                  ${safeMessage ? `
                  <div class="details-row">
                    <span class="label">Message:</span>
                    <span class="value">${safeMessage}</span>
                  </div>
                  ` : ''}
                </div>

                <h3>What's Next?</h3>
                <ul>
                  <li>Our team will prepare a custom quote based on your requirements</li>
                  <li>We'll reach out within <strong>24 hours</strong> with pricing and details</li>
                  <li>Team packages include custom pricing tailored to your group size</li>
                  <li>Simplified invoicing with bank transfer payment option available</li>
                </ul>

                <p>In the meantime, feel free to explore more about the conference:</p>
                <p style="text-align: center;">
                  <a href="${baseUrl}" class="button">View Conference Details</a>
                </p>

                <p>If you have any immediate questions, don't hesitate to reply to this email.</p>

                <p>Best regards,<br>
                <strong>The ZurichJS Team</strong></p>
              </div>
              <div class="footer">
                <p>ZurichJS Conference 2026<br>
                Zurich, Switzerland</p>
                <p style="font-size: 12px; color: #999;">
                  This is an automated confirmation email. Please do not reply directly to this message.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Send notification email to sales team
    await sendEmailSafely('team request sales notification', {
      from: 'ZurichJS Conference <hello@zurichjs.com>',
      to: 'hello@zurichjs.com',
      subject: sanitizeHeader(`New Team Package Request - ${company} (${quantity} tickets)`),
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1a1a1a; color: #ffd700; padding: 30px 20px; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e0e0e0; border-top: none; }
              .highlight-box { background: #fff3cd; border: 2px solid #ffd700; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
              .details-row:last-child { border-bottom: none; }
              .label { font-weight: 600; color: #555; }
              .value { color: #333; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 8px 8px; }
              .tag { display: inline-block; background: #ffd700; color: #1a1a1a; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🎟️ New Team Package Request</h1>
              </div>
              <div class="content">
                <div class="highlight-box">
                  <h2 style="margin: 0 0 10px 0; font-size: 20px;">${safeCompany}</h2>
                  <p style="margin: 0; font-size: 18px;">
                    Requesting <strong>${safeQuantity} ${safeTicketType}</strong> tickets
                    <span class="tag">PRIORITY</span>
                  </p>
                </div>

                <h3>Contact Information</h3>
                <div class="details">
                  <div class="details-row">
                    <span class="label">Name:</span>
                    <span class="value">${safeName}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Email:</span>
                    <span class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></span>
                  </div>
                  <div class="details-row">
                    <span class="label">Company:</span>
                    <span class="value">${safeCompany}</span>
                  </div>
                </div>

                <h3>Request Details</h3>
                <div class="details">
                  <div class="details-row">
                    <span class="label">Ticket Type:</span>
                    <span class="value">${safeTicketType}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Quantity:</span>
                    <span class="value">${safeQuantity} tickets</span>
                  </div>
                  ${safeMessage ? `
                  <div class="details-row">
                    <span class="label">Additional Message:</span>
                    <span class="value">${safeMessage}</span>
                  </div>
                  ` : '<p style="margin: 10px 0; color: #666;"><em>No additional message provided</em></p>'}
                </div>

                <h3>💡 Suggested Action</h3>
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                  ${quantity >= 5 ? '<p style="margin: 0;"><strong>Tier 2 Team Package</strong> - 5+ tickets (custom pricing)</p>' :
                    quantity >= 3 ? '<p style="margin: 0;"><strong>Tier 1 Team Package</strong> - 3-4 tickets (custom pricing)</p>' :
                    '<p style="margin: 0;">Standard individual pricing (less than 3 tickets)</p>'}
                </div>

                <h3>⏭️ Next Steps</h3>
                <ol>
                  <li>Review the request and prepare a custom quote</li>
                  <li>Reply to <strong>${safeEmail}</strong> within 24 hours</li>
                  <li>Include custom pricing and bank transfer payment option</li>
                  <li>Mention simplified invoicing (single invoice for entire team)</li>
                  <li>CC hello@zurichjs.com for tracking</li>
                </ol>

                <p style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px;">
                  <strong>📧 Quick Reply:</strong><br>
                  <a href="${replyHref}">Send Quote to ${safeName}</a>
                </p>
              </div>
              <div class="footer">
                <p>Team Request System - ZurichJS Conference 2026</p>
                <p style="font-size: 12px; color: #999;">
                  Submitted on ${new Date().toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: 'Europe/Zurich'
                  })}
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return res.status(200).json({
      success: true,
      message: 'Team request submitted successfully',
    });
  } catch (error) {
    log.error('Error processing team request', error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit team request';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
