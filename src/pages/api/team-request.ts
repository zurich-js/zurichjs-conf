/**
 * Team Request API Endpoint
 * Handles team package inquiries and sends emails
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import type { TeamRequestData } from '@/components/molecules';

const resend = new Resend(process.env.RESEND_API_KEY);

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
      console.error('RESEND_API_KEY is not configured');
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
      });
    }

    // Send confirmation email to customer
    const customerEmailResult = await resend.emails.send({
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
                <p>Hi ${name},</p>
                <p>Thank you for your interest in our team packages for <strong>ZurichJS Conference 2026</strong>!</p>
                <p>We've received your request and our team will review it shortly. Here's what you requested:</p>

                <div class="details">
                  <div class="details-row">
                    <span class="label">Ticket Type:</span>
                    <span class="value">${ticketType}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Quantity:</span>
                    <span class="value">${quantity} tickets</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Company:</span>
                    <span class="value">${company}</span>
                  </div>
                  ${message ? `
                  <div class="details-row">
                    <span class="label">Message:</span>
                    <span class="value">${message}</span>
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
                  <a href="https://conf.zurichjs.com" class="button">View Conference Details</a>
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

    if (customerEmailResult.error) {
      console.error('Failed to send customer email:', customerEmailResult.error);
      // Don't fail the request if customer email fails, but log it
    }

    // Send notification email to sales team
    const salesEmailResult = await resend.emails.send({
      from: 'ZurichJS Conference <hello@zurichjs.com>',
      to: 'hello@zurichjs.com',
      subject: `🎟️ New Team Package Request - ${company} (${quantity} tickets)`,
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
                  <h2 style="margin: 0 0 10px 0; font-size: 20px;">${company}</h2>
                  <p style="margin: 0; font-size: 18px;">
                    Requesting <strong>${quantity} ${ticketType}</strong> tickets
                    <span class="tag">PRIORITY</span>
                  </p>
                </div>

                <h3>Contact Information</h3>
                <div class="details">
                  <div class="details-row">
                    <span class="label">Name:</span>
                    <span class="value">${name}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Email:</span>
                    <span class="value"><a href="mailto:${email}">${email}</a></span>
                  </div>
                  <div class="details-row">
                    <span class="label">Company:</span>
                    <span class="value">${company}</span>
                  </div>
                </div>

                <h3>Request Details</h3>
                <div class="details">
                  <div class="details-row">
                    <span class="label">Ticket Type:</span>
                    <span class="value">${ticketType}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Quantity:</span>
                    <span class="value">${quantity} tickets</span>
                  </div>
                  ${message ? `
                  <div class="details-row">
                    <span class="label">Additional Message:</span>
                    <span class="value">${message}</span>
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
                  <li>Reply to <strong>${email}</strong> within 24 hours</li>
                  <li>Include custom pricing and bank transfer payment option</li>
                  <li>Mention simplified invoicing (single invoice for entire team)</li>
                  <li>CC hello@zurichjs.com for tracking</li>
                </ol>

                <p style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px;">
                  <strong>📧 Quick Reply:</strong><br>
                  <a href="mailto:${email}?subject=Re: Team Package for ZurichJS Conference 2026&cc=hello@zurichjs.com">Send Quote to ${name}</a>
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

    if (salesEmailResult.error) {
      console.error('Failed to send sales email:', salesEmailResult.error);
      // Still return success to user even if sales notification fails
    }

    return res.status(200).json({
      success: true,
      message: 'Team request submitted successfully',
    });
  } catch (error) {
    console.error('Team request error:', error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit team request';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
