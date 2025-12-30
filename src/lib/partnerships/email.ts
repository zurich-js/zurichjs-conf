/**
 * Partnership Email Operations
 * Handles sending partnership package emails via Resend
 */

import * as React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { getBaseUrl } from '@/lib/url';
import { PartnershipPackageEmail } from '@/emails/templates/PartnershipPackageEmail';
import type { PartnershipPackageEmailProps } from '@/emails/templates/PartnershipPackageEmail';
import type {
  Partnership,
  PartnershipCoupon,
  PartnershipVoucher,
  SendPartnershipEmailRequest,
} from '@/lib/types/partnership';
import { formatDiscount } from './coupons';
import { formatVoucherValue } from './vouchers';
import { generateTrackingUrl } from './partnerships';

const log = logger.scope('PartnershipEmails');

/**
 * Email configuration
 */
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'ZurichJS Conference <hello@zurichjs.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'hello@zurichjs.com',
};

/**
 * Get Resend client
 */
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

/**
 * Send partnership package email
 */
export async function sendPartnershipEmail(
  data: SendPartnershipEmailRequest
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const supabase = createServiceRoleClient();

  // Fetch the partnership with coupons and vouchers
  const { data: partnership, error: partnershipError } = await supabase
    .from('partnerships')
    .select(`
      *,
      coupons:partnership_coupons(*),
      vouchers:partnership_vouchers(*)
    `)
    .eq('id', data.partnership_id)
    .single();

  if (partnershipError || !partnership) {
    log.error('Failed to fetch partnership for email', partnershipError);
    return { success: false, error: 'Partnership not found' };
  }

  const p = partnership as Partnership & {
    coupons: PartnershipCoupon[];
    vouchers: PartnershipVoucher[];
  };

  // Prepare coupon codes for email
  const couponCodes = data.include_coupons
    ? (p.coupons || [])
        .filter((c) => c.is_active)
        .map((c) => ({
          code: c.code,
          description: c.type === 'percentage'
            ? 'Discount on conference tickets'
            : 'Fixed amount discount',
          discount: formatDiscount(c),
          expires_at: c.expires_at
            ? new Date(c.expires_at).toLocaleDateString('en-CH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : undefined,
        }))
    : [];

  // Prepare voucher codes for email
  const voucherCodes = data.include_vouchers
    ? (p.vouchers || [])
        .filter((v) => !v.is_redeemed)
        .map((v) => ({
          code: v.code,
          purpose: v.purpose,
          value: formatVoucherValue(v),
        }))
    : [];

  // Generate tracking URL
  const trackingUrl = generateTrackingUrl(p as Partnership, getBaseUrl());

  // Asset URLs
  const logoUrl = data.include_logo
    ? `${getBaseUrl()}/images/logo/zurichjs-square.png`
    : undefined;
  const bannerUrl = data.include_banner
    ? `${getBaseUrl()}/images/conference-banner.png`
    : undefined;

  // Prepare email props
  const emailProps: PartnershipPackageEmailProps = {
    partnerName: p.contact_name,
    partnershipName: p.name,
    partnershipType: p.type,
    couponCodes,
    voucherCodes,
    trackingUrl,
    logoUrl,
    bannerUrl,
    customMessage: data.custom_message,
  };

  try {
    const resend = getResendClient();

    // Render the email
    const emailHtml = await render(
      React.createElement(PartnershipPackageEmail, emailProps)
    );

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: p.contact_email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your ZurichJS Conference 2026 Partnership Package`,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Failed to send partnership email', new Error(result.error.message));
      return { success: false, error: result.error.message };
    }

    // Record the email in database
    const { error: recordError } = await supabase
      .from('partnership_emails')
      .insert({
        partnership_id: data.partnership_id,
        recipient_email: p.contact_email,
        recipient_name: p.contact_name,
        subject: 'Your ZurichJS Conference 2026 Partnership Package',
        resend_message_id: result.data?.id,
        included_coupons: data.include_coupons,
        included_vouchers: data.include_vouchers,
        included_logo: data.include_logo,
        included_banner: data.include_banner,
        custom_message: data.custom_message,
        status: 'sent',
      });

    if (recordError) {
      log.error('Failed to record partnership email', recordError);
      // Don't fail the request, email was sent successfully
    }

    log.info('Partnership email sent', {
      partnershipId: data.partnership_id,
      messageId: result.data?.id,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    log.error('Error sending partnership email', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get email history for a partnership
 */
export async function getEmailHistory(
  partnershipId: string
): Promise<Array<{
  id: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
  status: string;
}>> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('partnership_emails')
    .select('id, recipient_email, subject, sent_at, status')
    .eq('partnership_id', partnershipId)
    .order('sent_at', { ascending: false });

  if (error) {
    log.error('Failed to fetch email history', error, { partnershipId });
    throw new Error(`Failed to fetch email history: ${error.message}`);
  }

  return data || [];
}
