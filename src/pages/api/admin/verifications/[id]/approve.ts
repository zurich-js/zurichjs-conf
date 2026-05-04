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
import { sendVerificationApprovalEmail } from '@/lib/email';

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

    // Send approval email with payment link
    const firstName = verification.name.split(' ')[0] || verification.name;
    try {
      const emailResult = await sendVerificationApprovalEmail({
        to: verification.email,
        firstName,
        verificationType: verification.verification_type as 'student' | 'unemployed',
        verificationId: verification.verification_id,
        paymentLinkUrl: paymentLink.url,
      });

      if (emailResult.success) {
        log.info('Approval email sent', { email: verification.email });
      } else {
        log.error('Approval email failed', new Error(emailResult.error), { email: verification.email });
      }
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
