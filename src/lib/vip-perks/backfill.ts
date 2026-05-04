/**
 * VIP Perks Backfill
 * Generates VIP perk coupons for existing VIP ticket holders who don't have one yet
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { createVipPerkCoupon, getVipPerkConfig } from './coupons';
import { sendVipPerkEmail } from './email';
import type { BackfillVipPerksRequest, BackfillVipPerksResponse } from '@/lib/types/vip-perks';

const log = logger.scope('VipPerksBackfill');

/**
 * Backfill VIP perks for all VIP tickets that don't have one yet
 * Processes sequentially to respect Stripe rate limits
 */
export async function backfillVipPerks(
  request: BackfillVipPerksRequest
): Promise<BackfillVipPerksResponse> {
  const supabase = createServiceRoleClient();
  const config = await getVipPerkConfig();

  if (config.restricted_product_ids.length === 0) {
    throw new Error('VIP perk config has no restricted product IDs. Configure workshop products first.');
  }

  // Fetch all confirmed VIP tickets
  const { data: vipTickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, first_name, last_name, email')
    .eq('ticket_category', 'vip')
    .eq('status', 'confirmed')
    .order('created_at', { ascending: true });

  if (ticketsError) {
    log.error('Failed to fetch VIP tickets for backfill', ticketsError);
    throw new Error(`Failed to fetch VIP tickets: ${ticketsError.message}`);
  }

  const allVipTickets = vipTickets || [];
  const vipTicketIds = new Set(allVipTickets.map(t => t.id));

  // Fetch existing perks only for the confirmed VIP tickets we found
  const vipTicketIdArray = [...vipTicketIds];
  const { data: existingPerks, error: perksError } = await supabase
    .from('vip_perks')
    .select('ticket_id')
    .in('ticket_id', vipTicketIdArray);

  if (perksError) {
    log.error('Failed to fetch existing VIP perks', perksError);
    throw new Error(`Failed to fetch existing perks: ${perksError.message}`);
  }

  const existingTicketIds = new Set(
    (existingPerks || []).map(p => p.ticket_id)
  );
  const ticketsNeedingPerks = allVipTickets.filter(t => !existingTicketIds.has(t.id));

  const response: BackfillVipPerksResponse = {
    total_vip_tickets: allVipTickets.length,
    already_have_perk: existingTicketIds.size,
    created: 0,
    failed: 0,
    emails_sent: 0,
    failures: [],
  };

  // Dry run — return counts without creating anything
  if (request.dry_run) {
    log.info('VIP perks backfill dry run', {
      totalVip: allVipTickets.length,
      alreadyHavePerk: existingTicketIds.size,
      wouldCreate: ticketsNeedingPerks.length,
    });
    return response;
  }

  log.info('Starting VIP perks backfill', {
    totalVip: allVipTickets.length,
    toCreate: ticketsNeedingPerks.length,
  });

  // Process sequentially to respect Stripe rate limits
  for (const ticket of ticketsNeedingPerks) {
    try {
      const perk = await createVipPerkCoupon({
        ticket_id: ticket.id,
        restricted_product_ids: config.restricted_product_ids,
        discount_percent: config.discount_percent,
        expires_at: config.expires_at || undefined,
      });

      response.created++;

      // Send email if requested
      if (request.send_emails) {
        // Rate limit: Resend allows max 2 requests/sec
        await new Promise(resolve => setTimeout(resolve, 600));

        const emailResult = await sendVipPerkEmail({
          vip_perk_id: perk.id,
          custom_message: request.custom_message,
        });

        if (emailResult.success) {
          response.emails_sent++;
        } else {
          log.warn('Failed to send VIP perk email during backfill', {
            ticketId: ticket.id,
            error: emailResult.error,
          });
        }
      }
    } catch (error) {
      response.failed++;
      response.failures.push({
        ticket_id: ticket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      log.error('Failed to create VIP perk during backfill', error as Error, {
        ticketId: ticket.id,
      });
    }
  }

  log.info('VIP perks backfill completed', {
    created: response.created,
    failed: response.failed,
    emailsSent: response.emails_sent,
  });

  return response;
}
