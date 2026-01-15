/**
 * Admin Confirm VIP Upgrade Payment API
 * POST /api/admin/tickets/[id]/upgrade-confirm-payment
 *
 * Confirms a bank transfer payment for a VIP upgrade and completes the upgrade.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';
import type {
  ConfirmUpgradePaymentResponse,
  TicketUpgrade,
} from '@/lib/types/ticket-upgrade';

const log = logger.scope('Admin Confirm Upgrade Payment');

// Request validation schema
const confirmPaymentSchema = z.object({
  upgradeId: z.string().uuid(),
  paymentReference: z.string().max(100).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfirmUpgradePaymentResponse | { error: string; details?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ticketId = req.query.id as string;

  if (!ticketId) {
    return res.status(400).json({ error: 'Ticket ID is required' });
  }

  try {
    // Verify admin authentication
    const token = req.cookies.admin_token;
    if (!verifyAdminToken(token)) {
      log.warn('Unauthorized confirm payment attempt', { ticketId });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const parseResult = confirmPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      log.warn('Invalid confirm payment request', {
        ticketId,
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.issues.map((e) => e.message).join(', '),
      });
    }

    const { upgradeId, paymentReference } = parseResult.data;

    log.info('Processing upgrade payment confirmation', {
      ticketId,
      upgradeId,
    });

    const supabase = createServiceRoleClient();

    // Fetch the upgrade record
    const { data: upgrade, error: upgradeError } = await supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('id', upgradeId)
      .eq('ticket_id', ticketId)
      .single();

    if (upgradeError || !upgrade) {
      log.error('Upgrade not found', upgradeError, { upgradeId, ticketId });
      return res.status(404).json({ error: 'Upgrade not found' });
    }

    // Validate upgrade can be confirmed
    if (upgrade.status === 'completed') {
      log.warn('Attempted to confirm already completed upgrade', {
        upgradeId,
        ticketId,
      });
      return res.status(400).json({ error: 'Upgrade is already completed' });
    }

    if (upgrade.status === 'cancelled') {
      log.warn('Attempted to confirm cancelled upgrade', {
        upgradeId,
        ticketId,
      });
      return res.status(400).json({ error: 'Upgrade has been cancelled' });
    }

    if (upgrade.upgrade_mode !== 'bank_transfer') {
      log.warn('Attempted to manually confirm non-bank-transfer upgrade', {
        upgradeId,
        ticketId,
        mode: upgrade.upgrade_mode,
      });
      return res.status(400).json({
        error: 'Only bank transfer upgrades can be manually confirmed',
      });
    }

    // Fetch the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      log.error('Ticket not found during payment confirmation', ticketError, {
        upgradeId,
        ticketId,
      });
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Update ticket to VIP
    const { error: ticketUpdateError } = await supabase
      .from('tickets')
      .update({
        ticket_category: 'vip',
        metadata: {
          ...(typeof ticket.metadata === 'object' && ticket.metadata !== null ? ticket.metadata : {}),
          upgraded_from: ticket.ticket_category,
          upgraded_at: new Date().toISOString(),
          upgrade_id: upgradeId,
          bank_transfer_confirmed: true,
          bank_transfer_payment_reference: paymentReference || null,
        },
      })
      .eq('id', ticketId);

    if (ticketUpdateError) {
      log.error('Failed to update ticket to VIP', ticketUpdateError, {
        upgradeId,
        ticketId,
      });
      return res.status(500).json({ error: 'Failed to update ticket' });
    }

    // Update upgrade record
    const { error: upgradeUpdateError } = await supabase
      .from('ticket_upgrades')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        // Store additional payment reference if provided
        bank_transfer_reference: paymentReference || upgrade.bank_transfer_reference,
      })
      .eq('id', upgradeId);

    if (upgradeUpdateError) {
      log.error('Failed to update upgrade status', upgradeUpdateError, {
        upgradeId,
        ticketId,
      });
      // Note: Ticket was already updated, so we log but don't fail
    }

    log.info('Bank transfer upgrade confirmed', {
      upgradeId,
      ticketId,
      paymentReference,
    });

    // Track analytics
    await serverAnalytics.track('vip_upgrade_payment_confirmed', ticket.email, {
      ticket_id: ticketId,
      upgrade_id: upgradeId,
      upgrade_mode: 'bank_transfer',
      amount: upgrade.amount,
      currency: upgrade.currency,
      payment_reference: paymentReference || null,
    });

    // Fetch updated upgrade record
    const { data: finalUpgrade } = await supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('id', upgradeId)
      .single();

    return res.status(200).json({
      success: true,
      upgrade: finalUpgrade as TicketUpgrade,
    });

  } catch (error) {
    log.error('Unexpected error confirming upgrade payment', error, {
      ticketId,
      type: 'system',
      severity: 'critical',
    });

    serverAnalytics.captureException(error, {
      distinctId: 'admin',
      type: 'system',
      severity: 'critical',
      flow: 'vip_upgrade_confirm',
    });

    return res.status(500).json({ error: 'Internal server error' });
  }
}
