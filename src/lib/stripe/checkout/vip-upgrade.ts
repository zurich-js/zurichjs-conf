/**
 * VIP Upgrade Payment Handler
 * Handles VIP upgrade payments via Stripe Payment Links
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendVipUpgradeEmail } from '@/lib/email';
import { generateOrderUrl } from '@/lib/auth/orderToken';
import { serverAnalytics } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';

/**
 * Handle VIP upgrade payment completion
 * Called when a Stripe Payment Link for VIP upgrade is paid
 * Returns true if this was an upgrade payment, false otherwise
 */
export async function handleVipUpgradePayment(
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const upgradeId = session.metadata?.upgrade_id;
  const ticketId = session.metadata?.ticket_id;

  // Not an upgrade payment
  if (!upgradeId || !ticketId) {
    return false;
  }

  const log = logger.scope('VipUpgradePayment', { sessionId: session.id, upgradeId, ticketId });
  log.info('Processing VIP upgrade payment');

  const supabase = createServiceRoleClient();

  try {
    // Fetch the upgrade record
    const { data: upgrade, error: upgradeError } = await supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('id', upgradeId)
      .eq('ticket_id', ticketId)
      .single();

    if (upgradeError || !upgrade) {
      log.error('Upgrade record not found', upgradeError, {
        type: 'payment',
        severity: 'critical',
        code: 'UPGRADE_NOT_FOUND',
      });
      throw new Error(`Upgrade record not found: ${upgradeId}`);
    }

    // Check if already completed (idempotency)
    if (upgrade.status === 'completed') {
      log.warn('Upgrade already completed, skipping', { upgradeId });
      return true;
    }

    // Verify this is a stripe upgrade awaiting payment
    if (upgrade.upgrade_mode !== 'stripe' || upgrade.status !== 'pending_payment') {
      log.warn('Upgrade not awaiting Stripe payment', {
        upgradeId,
        mode: upgrade.upgrade_mode,
        status: upgrade.status,
      });
      return true; // Still return true to prevent normal checkout processing
    }

    // Fetch the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      log.error('Ticket not found for upgrade', ticketError, {
        type: 'payment',
        severity: 'critical',
        code: 'TICKET_NOT_FOUND',
      });
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Update ticket to VIP
    const { error: ticketUpdateError } = await supabase
      .from('tickets')
      .update({
        ticket_category: 'vip',
        metadata: {
          ...(ticket.metadata as Record<string, unknown> || {}),
          upgraded_from: ticket.ticket_category,
          upgraded_at: new Date().toISOString(),
          upgrade_id: upgradeId,
          stripe_upgrade_session_id: session.id,
        },
      })
      .eq('id', ticketId);

    if (ticketUpdateError) {
      log.error('Failed to update ticket to VIP', ticketUpdateError, {
        type: 'system',
        severity: 'critical',
        code: 'TICKET_UPDATE_FAILED',
      });
      throw new Error('Failed to update ticket to VIP');
    }

    // Update upgrade record
    const { error: upgradeUpdateError } = await supabase
      .from('ticket_upgrades')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
      })
      .eq('id', upgradeId);

    if (upgradeUpdateError) {
      log.error('Failed to update upgrade status', upgradeUpdateError, {
        type: 'system',
        severity: 'medium',
        code: 'UPGRADE_UPDATE_FAILED',
      });
      // Non-fatal - ticket is already upgraded
    }

    log.info('VIP upgrade completed successfully', {
      ticketId,
      upgradeId,
      previousTier: ticket.ticket_category,
    });

    // Track analytics
    await serverAnalytics.track('vip_upgrade_completed', ticket.email, {
      ticket_id: ticketId,
      upgrade_id: upgradeId,
      upgrade_mode: 'stripe',
      amount: upgrade.amount,
      currency: upgrade.currency,
      previous_tier: ticket.ticket_category,
    });

    // Send confirmation email
    try {
      const orderUrl = generateOrderUrl(ticketId);
      await sendVipUpgradeEmail({
        to: ticket.email,
        firstName: ticket.first_name,
        ticketId,
        upgradeMode: 'stripe',
        upgradeStatus: 'completed',
        amount: upgrade.amount ?? null,
        currency: upgrade.currency ?? null,
        manageTicketUrl: orderUrl,
      });
      log.info('VIP upgrade confirmation email sent', { email: ticket.email });
    } catch (emailError) {
      log.error('Failed to send VIP upgrade confirmation email', emailError, {
        type: 'system',
        severity: 'medium',
        code: 'UPGRADE_EMAIL_FAILED',
      });
      // Non-fatal - upgrade is complete
    }

    return true;
  } catch (error) {
    log.error('Error completing VIP upgrade', error, {
      type: 'system',
      severity: 'critical',
      code: 'UPGRADE_COMPLETION_ERROR',
    });

    serverAnalytics.captureException(error, {
      distinctId: ticketId,
      type: 'system',
      severity: 'critical',
      flow: 'vip_upgrade_webhook',
    });

    throw error;
  }
}
