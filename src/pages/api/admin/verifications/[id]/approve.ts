/**
 * Admin Verification Approval API
 * POST /api/admin/verifications/[id]/approve
 *
 * Approves a student/unemployed verification request and creates a Stripe payment link.
 * The payment link includes the customer name in metadata so the webhook handler
 * can properly identify the attendee.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import { getResendClient, EMAIL_CONFIG } from '@/lib/email';

const log = logger.scope('Admin Verification Approve');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Verification ID is required' });
    }

    const supabase = createServiceRoleClient();

    // Fetch the verification request
    const { data: verification, error: fetchError } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !verification) {
      log.error('Verification request not found', fetchError, { id });
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        error: `Verification is already ${verification.status}`,
      });
    }

    // Create Stripe payment link with customer name in metadata
    const stripe = getStripeClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://conf.zurichjs.com';

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: verification.price_id, quantity: 1 }],
      metadata: {
        verification_id: verification.id,
        customer_name: verification.name,
        customer_email: verification.email,
        type: `${verification.verification_type}_verification`,
      },
      after_completion: {
        type: 'redirect',
        redirect: { url: `${siteUrl}/tickets/success` },
      },
      billing_address_collection: 'required',
      customer_creation: 'always',
    });

    log.info('Stripe payment link created for verification', {
      verificationId: verification.id,
      paymentLinkId: paymentLink.id,
    });

    // Update verification record
    const { error: updateError } = await supabase
      .from('verification_requests')
      .update({
        status: 'approved',
        stripe_payment_link_id: paymentLink.id,
        stripe_payment_link_url: paymentLink.url,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      log.error('Failed to update verification status', updateError, { id });
    }

    // Send payment link email to the user
    try {
      const resend = getResendClient();
      const typeLabel = verification.verification_type === 'student' ? 'Student' : 'Unemployed';

      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: verification.email,
        subject: `Your ${typeLabel} Verification is Approved - ZurichJS Conference 2026`,
        html: buildApprovalEmailHtml(verification.name, typeLabel, paymentLink.url),
      });

      log.info('Approval email sent', { email: verification.email });
    } catch (emailError) {
      log.error('Failed to send approval email', emailError);
      // Don't fail the request if email fails — admin can share the link manually
    }

    return res.status(200).json({
      success: true,
      paymentLinkUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
    });
  } catch (error) {
    log.error('Failed to approve verification', error);
    return res.status(500).json({ error: 'Failed to approve verification' });
  }
}

/**
 * Build HTML email for verification approval with payment link
 */
function buildApprovalEmailHtml(name: string, typeLabel: string, paymentLinkUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Approved</title>
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
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: bold;">Your ${typeLabel} Verification is Approved!</h2>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your ${typeLabel.toLowerCase()} verification has been approved. You can now purchase your discounted ticket using the secure payment link below.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${paymentLinkUrl}" style="display: inline-block; background-color: #000000; color: #F1E271; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                  Complete Your Purchase
                </a>
              </div>

              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${paymentLinkUrl}" style="color: #258BCC; word-break: break-all;">${paymentLinkUrl}</a>
              </p>

              <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
                If you have any questions, please contact us at
                <a href="mailto:hello@zurichjs.com" style="color: #000000; text-decoration: underline;">hello@zurichjs.com</a>.
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
