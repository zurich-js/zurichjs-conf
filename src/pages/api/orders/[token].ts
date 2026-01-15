/**
 * Order Details API
 * GET /api/orders/[token]
 * Allows attendees to view their order using a secure token from email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyOrderToken } from '@/lib/auth/orderToken';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Ticket } from '@/lib/types/database';
import type { TicketUpgrade } from '@/lib/types/ticket-upgrade';
import { logger } from '@/lib/logger';

const log = logger.scope('Order Details API');

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
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderDetailsResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Verify the token and extract ticket ID
    const ticketId = verifyOrderToken(token);

    if (!ticketId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch ticket details
    const supabase = createServiceRoleClient();
    const { data, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !data) {
      log.error('Error fetching ticket', fetchError);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Type the ticket data explicitly to include transfer tracking fields
    const ticket = data as Ticket;

    // Build response
    const response: OrderDetailsResponse = {
      ticket,
    };

    // Add transfer info if ticket was transferred
    if (ticket.transferred_from_name && ticket.transferred_from_email && ticket.transferred_at) {
      response.transferInfo = {
        transferredFrom: ticket.transferred_from_name,
        transferredFromEmail: ticket.transferred_from_email,
        transferredAt: ticket.transferred_at,
      };
    }

    // Check for pending VIP upgrade
    const { data: pendingUpgrade } = await supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('ticket_id', ticketId)
      .in('status', ['pending_payment', 'pending_bank_transfer'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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

    return res.status(200).json(response);
  } catch (error) {
    log.error('Error getting order details', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
