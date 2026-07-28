/**
 * Order Details
 * Shared lookup used by GET /api/orders/[token] and the manage-order page's
 * getServerSideProps, so SSR reads Supabase directly instead of hopping
 * through its own API route.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { Ticket } from '@/lib/types/database';
import type { TicketUpgrade } from '@/lib/types/ticket-upgrade';
import { logger } from '@/lib/logger';

const log = logger.scope('Order Details');

export interface OrderDetailsResponse {
  ticket: Ticket;
  transferInfo?: {
    transferredFrom: string;
    transferredFromEmail: string;
    transferredAt: string;
  };
  pendingUpgrade?: {
    id: string;
    status: TicketUpgrade['status'];
    upgradeMode: TicketUpgrade['upgrade_mode'];
    amount: number | null;
    currency: string | null;
    stripePaymentLinkUrl: string | null;
    bankTransferReference: string | null;
    bankTransferDueDate: string | null;
    createdAt: string;
  };
  apparelPreferences?: {
    tshirtSize: string | null;
    hoodieSize: string | null;
  };
  /** Workshop discount voucher — present only for VIP tickets with an issued, active voucher */
  vipPerk?: {
    code: string;
    discountPercent: number;
    expiresAt: string | null;
    isRedeemed: boolean;
  };
}

/**
 * Fetch everything the manage-order page needs for a ticket.
 *
 * All four queries key off the ticket ID alone, so they run in a single
 * parallel round trip (the vip_perks lookup runs for every ticket and is
 * simply discarded for non-VIPs — cheaper than serializing on the ticket row).
 *
 * Returns null when the ticket doesn't exist.
 */
export async function getOrderDetails(ticketId: string): Promise<OrderDetailsResponse | null> {
  const supabase = createServiceRoleClient();

  const [ticketResult, pendingUpgradeResult, vipPerkResult, apparelResult] = await Promise.all([
    supabase.from('tickets').select('*').eq('id', ticketId).single(),
    supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('ticket_id', ticketId)
      .in('status', ['pending_payment', 'pending_bank_transfer'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('vip_perks')
      .select('code, discount_percent, expires_at, max_redemptions, current_redemptions')
      .eq('ticket_id', ticketId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('ticket_apparel_preferences')
      .select('tshirt_size, hoodie_size')
      .eq('ticket_id', ticketId)
      .maybeSingle(),
  ]);

  if (ticketResult.error || !ticketResult.data) {
    log.error('Error fetching ticket', ticketResult.error, { ticketId });
    return null;
  }

  const ticket = ticketResult.data as Ticket;

  const response: OrderDetailsResponse = { ticket };

  if (ticket.transferred_from_name && ticket.transferred_from_email && ticket.transferred_at) {
    response.transferInfo = {
      transferredFrom: ticket.transferred_from_name,
      transferredFromEmail: ticket.transferred_from_email,
      transferredAt: ticket.transferred_at,
    };
  }

  const pendingUpgrade = pendingUpgradeResult.data;
  if (pendingUpgrade) {
    response.pendingUpgrade = {
      id: pendingUpgrade.id,
      status: pendingUpgrade.status as 'pending_payment' | 'pending_bank_transfer',
      upgradeMode: pendingUpgrade.upgrade_mode as 'complimentary' | 'bank_transfer' | 'stripe',
      amount: pendingUpgrade.amount,
      currency: pendingUpgrade.currency,
      stripePaymentLinkUrl: pendingUpgrade.stripe_payment_link_url,
      bankTransferReference: pendingUpgrade.bank_transfer_reference,
      bankTransferDueDate: pendingUpgrade.bank_transfer_due_date,
      createdAt: pendingUpgrade.created_at,
    };
  }

  if (ticket.ticket_category === 'vip') {
    if (vipPerkResult.error) {
      // Non-fatal — the page still works without the voucher block
      log.error('Error fetching VIP perk for order', vipPerkResult.error, { ticketId });
    } else if (vipPerkResult.data) {
      const vipPerk = vipPerkResult.data;
      response.vipPerk = {
        code: vipPerk.code,
        discountPercent: vipPerk.discount_percent,
        expiresAt: vipPerk.expires_at,
        isRedeemed: vipPerk.max_redemptions != null && vipPerk.current_redemptions >= vipPerk.max_redemptions,
      };
    }
  }

  if (apparelResult.data) {
    response.apparelPreferences = {
      tshirtSize: apparelResult.data.tshirt_size,
      hoodieSize: apparelResult.data.hoodie_size,
    };
  }

  return response;
}
