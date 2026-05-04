/**
 * VIP Perk Email Operations
 * Handles sending VIP workshop discount emails via Resend
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { VipPerkEmail } from '@/emails/templates/VipPerkEmail';
import type { VipPerkEmailProps } from '@/emails/templates/VipPerkEmail';
import type { SendVipPerkEmailRequest, VipPerkEmail as VipPerkEmailRecord } from '@/lib/types/vip-perks';

const log = logger.scope('VipPerkEmails');

const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'ZurichJS Conference <hello@zurichjs.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'hello@zurichjs.com',
  supportEmail: 'hello@zurichjs.com',
};

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

/**
 * Send VIP perk email to a ticket holder
 */
export async function sendVipPerkEmail(
  data: SendVipPerkEmailRequest
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const supabase = createServiceRoleClient();

  // Fetch the perk with ticket info
  const { data: perk, error: perkError } = await supabase
    .from('vip_perks')
    .select(`
      *,
      ticket:tickets!inner(id, first_name, last_name, email)
    `)
    .eq('id', data.vip_perk_id)
    .single();

  if (perkError || !perk) {
    log.error('Failed to fetch VIP perk for email', perkError);
    return { success: false, error: 'VIP perk not found' };
  }

  const ticket = perk.ticket as { id: string; first_name: string; last_name: string; email: string };

  const emailProps: VipPerkEmailProps = {
    firstName: ticket.first_name,
    couponCode: perk.code,
    discountPercent: perk.discount_percent,
    workshopsUrl: 'https://conf.zurichjs.com/workshops',
    customMessage: data.custom_message,
    expiresAt: perk.expires_at
      ? new Date(perk.expires_at).toLocaleDateString('en-CH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined,
    supportEmail: EMAIL_CONFIG.supportEmail,
  };

  try {
    const resend = getResendClient();

    const emailHtml = await render(
      React.createElement(VipPerkEmail, emailProps)
    );

    const subject = `Your VIP Workshop Discount - ${perk.discount_percent}% Off - ZurichJS Conf`;

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: ticket.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Failed to send VIP perk email', new Error(result.error.message));
      return { success: false, error: result.error.message };
    }

    // Record the email
    const { error: recordError } = await supabase
      .from('vip_perk_emails')
      .insert({
        vip_perk_id: data.vip_perk_id,
        ticket_id: ticket.id,
        recipient_email: ticket.email,
        recipient_name: `${ticket.first_name} ${ticket.last_name}`,
        subject,
        resend_message_id: result.data?.id,
        custom_message: data.custom_message,
        status: 'sent',
      });

    if (recordError) {
      log.error('Failed to record VIP perk email', recordError);
      // Don't fail — email was sent successfully
    }

    log.info('VIP perk email sent', {
      perkId: data.vip_perk_id,
      email: ticket.email,
      messageId: result.data?.id,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    log.error('Error sending VIP perk email', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get email history for a VIP perk
 */
export async function getVipPerkEmailHistory(
  perkId: string
): Promise<VipPerkEmailRecord[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('vip_perk_emails')
    .select('*')
    .eq('vip_perk_id', perkId)
    .order('sent_at', { ascending: false });

  if (error) {
    log.error('Failed to fetch VIP perk email history', error, { perkId });
    throw new Error(`Failed to fetch email history: ${error.message}`);
  }

  return (data || []) as VipPerkEmailRecord[];
}
