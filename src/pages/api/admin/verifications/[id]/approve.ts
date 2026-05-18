/**
 * Admin Verification Approval API
 * POST /api/admin/verifications/[id]/approve
 *
 * Approves a verification request (student / unemployed / oss_maintainer) and
 * creates a Stripe payment link. For OSS maintainers the link has the
 * tier-appropriate coupon attached so the discount is pre-applied — no promo
 * code entry required by the customer.
 *
 * Body (optional, OSS-only overrides):
 *   - qualifyingTier?: 1 | 2 | 3 | 4 — admin override of the auto-computed tier
 *   - ticketTier?: 'standard' | 'vip' — admin override of the applicant's pick
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Database } from '@/lib/types/database';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import { sendVerificationApprovalEmail } from '@/lib/email';
import {
  createPromotionCodeForVerification,
  getOssSeatInfo,
  OSS_TIER_DISCOUNT,
  resolveOssTicketPrice,
  type OssQualifyingTier,
  type OssTicketTier,
} from '@/lib/oss';

type VerificationRequestUpdate = Database['public']['Tables']['verification_requests']['Update'];

const log = logger.scope('Admin Verification Approve');

function isQualifyingTier(value: unknown): value is OssQualifyingTier {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function isTicketTier(value: unknown): value is OssTicketTier {
  return value === 'standard' || value === 'vip';
}

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

    const stripe = getStripeClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://conf.zurichjs.com';
    const isOssMaintainer = verification.verification_type === 'oss_maintainer';

    let priceIdToUse = verification.price_id;
    let couponIdToAttach: string | null = null;
    let promotionCodeString: string | null = null;
    let discountPercent: number | null = null;
    let qualifyingTierApplied: OssQualifyingTier | null = null;
    let ticketTierApplied: OssTicketTier | null = null;

    if (isOssMaintainer) {
      // Seat cap re-check at the moment of approval — protects against approving
      // beyond the cap when multiple admins are reviewing concurrently.
      const seats = await getOssSeatInfo();
      if (seats.soldOut) {
        return res.status(409).json({ error: 'OSS maintainer seats are sold out.' });
      }

      const body = (req.body ?? {}) as { qualifyingTier?: unknown; ticketTier?: unknown };
      const overrideTier = body.qualifyingTier;
      const overrideTicketTier = body.ticketTier;

      const tier = isQualifyingTier(overrideTier)
        ? overrideTier
        : isQualifyingTier(verification.qualifying_tier)
          ? (verification.qualifying_tier as OssQualifyingTier)
          : null;
      if (!tier) {
        return res.status(400).json({
          error: 'Cannot approve: no qualifying tier on record and none provided in override.',
        });
      }

      const ticketTier = isTicketTier(overrideTicketTier)
        ? overrideTicketTier
        : isTicketTier(verification.requested_ticket_tier)
          ? (verification.requested_ticket_tier as OssTicketTier)
          : null;
      if (!ticketTier) {
        return res.status(400).json({
          error: 'Cannot approve: no ticket tier on record and none provided in override.',
        });
      }

      const priceInfo = await resolveOssTicketPrice({
        ticketTier,
        currency: verification.currency,
      });
      if (!priceInfo) {
        log.error('Failed to resolve current OSS price at approval', null, { id, ticketTier });
        return res.status(500).json({
          error: 'Could not look up current ticket pricing.',
        });
      }
      priceIdToUse = priceInfo.priceId;

      const { code, couponId } = await createPromotionCodeForVerification(
        tier,
        verification.verification_id,
        verification.email
      );
      couponIdToAttach = couponId;
      promotionCodeString = code;
      discountPercent = OSS_TIER_DISCOUNT[tier];
      qualifyingTierApplied = tier;
      ticketTierApplied = ticketTier;
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceIdToUse, quantity: 1 }],
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
      allow_promotion_codes: isOssMaintainer ? true : undefined,
    });

    // Pre-apply the discount on the URL we send out so the customer doesn't
    // have to type the code at checkout.
    const paymentLinkUrl = promotionCodeString
      ? `${paymentLink.url}?prefilled_promo_code=${encodeURIComponent(promotionCodeString)}`
      : paymentLink.url;

    log.info('Stripe payment link created for verification', {
      verificationId: verification.id,
      paymentLinkId: paymentLink.id,
      couponId: couponIdToAttach,
      promotionCode: promotionCodeString,
      discountPercent,
    });

    const updatePayload: VerificationRequestUpdate = {
      status: 'approved',
      stripe_payment_link_id: paymentLink.id,
      stripe_payment_link_url: paymentLinkUrl,
      reviewed_at: new Date().toISOString(),
    };
    if (couponIdToAttach) updatePayload.stripe_coupon_id = couponIdToAttach;
    if (discountPercent !== null) updatePayload.discount_percent = discountPercent;
    if (qualifyingTierApplied !== null) updatePayload.qualifying_tier = qualifyingTierApplied;
    if (ticketTierApplied !== null) updatePayload.requested_ticket_tier = ticketTierApplied;
    // For OSS we may have re-resolved the price; persist it so the admin UI is accurate.
    if (priceIdToUse !== verification.price_id) updatePayload.price_id = priceIdToUse;

    const { error: updateError } = await supabase
      .from('verification_requests')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      log.error('Failed to update verification status', updateError, { id });
    }

    const firstName = verification.name.split(' ')[0] || verification.name;
    try {
      const emailResult = await sendVerificationApprovalEmail({
        to: verification.email,
        firstName,
        verificationType: verification.verification_type as 'student' | 'unemployed' | 'oss_maintainer',
        verificationId: verification.verification_id,
        paymentLinkUrl,
        discountPercent: discountPercent ?? undefined,
        qualifyingTier: qualifyingTierApplied ?? undefined,
      });

      if (emailResult.success) {
        log.info('Approval email sent', { email: verification.email });
      } else {
        log.error('Approval email failed', new Error(emailResult.error), { email: verification.email });
      }
    } catch (emailError) {
      log.error('Failed to send approval email', emailError);
    }

    return res.status(200).json({
      success: true,
      paymentLinkUrl,
      paymentLinkId: paymentLink.id,
      couponId: couponIdToAttach,
      promotionCode: promotionCodeString,
      discountPercent,
      qualifyingTier: qualifyingTierApplied,
    });
  } catch (error) {
    log.error('Failed to approve verification', error);
    return res.status(500).json({ error: 'Failed to approve verification' });
  }
}
