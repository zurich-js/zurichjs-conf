/**
 * Admin Ticket Upgrade to VIP API
 * POST /api/admin/tickets/[id]/upgrade-to-vip
 *
 * Upgrades a standard ticket to VIP tier with support for:
 * - Complimentary upgrades
 * - Bank transfer payments
 * - Stripe payment links
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';
import { generateOrderUrl } from '@/lib/auth/orderToken';
import { sendVipUpgradeEmail } from '@/lib/email';
import {
  type UpgradeToVipResponse,
  type TicketUpgrade,
  generateUpgradeIdempotencyKey,
  generateBankTransferReference,
  BANK_TRANSFER_DETAILS,
} from '@/lib/types/ticket-upgrade';

const log = logger.scope('Admin Upgrade to VIP');

// Request validation schema
const upgradeRequestSchema = z.object({
  upgradeMode: z.enum(['complimentary', 'bank_transfer', 'stripe']),
  amount: z.number().int().positive().optional(),
  currency: z.enum(['CHF', 'EUR', 'GBP']).optional(),
  adminNote: z.string().max(500).optional(),
  bankTransferDueDate: z.string().optional(),
}).refine(
  (data) => {
    // Non-complimentary modes require amount and currency
    if (data.upgradeMode !== 'complimentary') {
      return data.amount !== undefined && data.currency !== undefined;
    }
    return true;
  },
  { message: 'Amount and currency are required for paid upgrades' }
).refine(
  (data) => {
    // Bank transfer mode requires due date
    if (data.upgradeMode === 'bank_transfer') {
      return data.bankTransferDueDate !== undefined;
    }
    return true;
  },
  { message: 'Due date is required for bank transfer upgrades' }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpgradeToVipResponse | { error: string; details?: string }>
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
      log.warn('Unauthorized upgrade attempt', { ticketId });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const parseResult = upgradeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      log.warn('Invalid upgrade request', {
        ticketId,
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.issues.map((e) => e.message).join(', '),
      });
    }

    const { upgradeMode, amount, currency, adminNote, bankTransferDueDate } = parseResult.data;

    log.info('Processing VIP upgrade request', {
      ticketId,
      upgradeMode,
      amount,
      currency,
    });

    const supabase = createServiceRoleClient();

    // Fetch the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      log.error('Ticket not found', ticketError, { ticketId });
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Validate ticket can be upgraded
    if (ticket.ticket_category === 'vip') {
      log.warn('Attempted to upgrade already VIP ticket', { ticketId });
      return res.status(400).json({ error: 'Ticket is already VIP' });
    }

    if (ticket.status !== 'confirmed') {
      log.warn('Attempted to upgrade non-confirmed ticket', {
        ticketId,
        status: ticket.status,
      });
      return res.status(400).json({
        error: 'Only confirmed tickets can be upgraded',
      });
    }

    // Check for existing upgrade (idempotency)
    const idempotencyKey = generateUpgradeIdempotencyKey(ticketId);

    const { data: existingUpgrade } = await supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .in('status', ['pending_payment', 'pending_bank_transfer', 'completed'])
      .maybeSingle();

    if (existingUpgrade) {
      log.warn('Duplicate upgrade attempt blocked', {
        ticketId,
        existingUpgradeId: existingUpgrade.id,
        existingStatus: existingUpgrade.status,
      });
      return res.status(409).json({
        error: 'An upgrade is already in progress or completed for this ticket',
      });
    }

    // Determine initial status based on upgrade mode
    let status: TicketUpgrade['status'];
    let stripePaymentLinkId: string | null = null;
    let stripePaymentLinkUrl: string | null = null;
    let bankTransferReference: string | null = null;

    // Create upgrade record (initially without Stripe link for stripe mode)
    const { data: upgrade, error: upgradeError } = await supabase
      .from('ticket_upgrades')
      .insert({
        ticket_id: ticketId,
        from_tier: ticket.ticket_category,
        to_tier: 'vip',
        upgrade_mode: upgradeMode,
        status: upgradeMode === 'complimentary' ? 'completed' : 'pending_payment', // Temporary, will update
        amount: upgradeMode === 'complimentary' ? null : amount,
        currency: upgradeMode === 'complimentary' ? null : currency,
        admin_note: adminNote,
        bank_transfer_due_date: bankTransferDueDate || null,
        idempotency_key: idempotencyKey,
        admin_user_id: 'admin', // Could extract from token if needed
        completed_at: upgradeMode === 'complimentary' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (upgradeError || !upgrade) {
      log.error('Failed to create upgrade record', upgradeError, { ticketId });
      return res.status(500).json({ error: 'Failed to create upgrade record' });
    }

    log.info('Upgrade record created', { upgradeId: upgrade.id, ticketId });

    // Handle mode-specific logic
    if (upgradeMode === 'stripe') {
      try {
        // Create Stripe payment link
        const stripe = getStripeClient();

        // Get order token for redirect URL
        const orderUrl = generateOrderUrl(ticketId);

        // Create product for this upgrade
        const product = await stripe.products.create({
          name: `VIP Upgrade - ZurichJS Conference 2026`,
          description: `Upgrade from ${ticket.ticket_category} to VIP tier`,
          metadata: {
            upgrade_id: upgrade.id,
            ticket_id: ticketId,
            type: 'vip_upgrade',
          },
        });

        // Create price
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: amount!,
          currency: currency!.toLowerCase(),
        });

        // Create payment link
        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: {
            upgrade_id: upgrade.id,
            ticket_id: ticketId,
            type: 'vip_upgrade',
          },
          after_completion: {
            type: 'redirect',
            redirect: { url: `${orderUrl}&upgraded=true` },
          },
          billing_address_collection: 'required',
          customer_creation: 'always',
        });

        stripePaymentLinkId = paymentLink.id;
        stripePaymentLinkUrl = paymentLink.url;
        status = 'pending_payment';

        log.info('Stripe payment link created', {
          upgradeId: upgrade.id,
          paymentLinkId: paymentLink.id,
        });

        // Update upgrade with Stripe info
        await supabase
          .from('ticket_upgrades')
          .update({
            stripe_payment_link_id: stripePaymentLinkId,
            stripe_payment_link_url: stripePaymentLinkUrl,
            status,
          })
          .eq('id', upgrade.id);

      } catch (stripeError) {
        log.error('Failed to create Stripe payment link', stripeError, {
          upgradeId: upgrade.id,
          ticketId,
        });

        // Rollback: Mark upgrade as cancelled
        await supabase
          .from('ticket_upgrades')
          .update({ status: 'cancelled' })
          .eq('id', upgrade.id);

        // Track error in analytics
        serverAnalytics.captureException(stripeError, {
          distinctId: ticket.email,
          type: 'payment',
          severity: 'high',
          flow: 'vip_upgrade',
          action: 'create_payment_link',
        });

        return res.status(500).json({
          error: 'Failed to create payment link',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error',
        });
      }

    } else if (upgradeMode === 'bank_transfer') {
      bankTransferReference = generateBankTransferReference(upgrade.id);
      status = 'pending_bank_transfer';

      // Update upgrade with bank transfer reference
      await supabase
        .from('ticket_upgrades')
        .update({
          bank_transfer_reference: bankTransferReference,
          status,
        })
        .eq('id', upgrade.id);

      log.info('Bank transfer upgrade created', {
        upgradeId: upgrade.id,
        reference: bankTransferReference,
      });

    } else {
      // Complimentary - update ticket immediately
      status = 'completed';

      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          ticket_category: 'vip',
          metadata: {
            ...(typeof ticket.metadata === 'object' && ticket.metadata !== null ? ticket.metadata : {}),
            upgraded_from: ticket.ticket_category,
            upgraded_at: new Date().toISOString(),
            upgrade_id: upgrade.id,
          },
        })
        .eq('id', ticketId);

      if (updateError) {
        log.error('Failed to update ticket to VIP', updateError, {
          upgradeId: upgrade.id,
          ticketId,
        });

        // Rollback: Mark upgrade as cancelled
        await supabase
          .from('ticket_upgrades')
          .update({ status: 'cancelled' })
          .eq('id', upgrade.id);

        return res.status(500).json({ error: 'Failed to update ticket' });
      }

      log.info('Complimentary VIP upgrade completed', {
        upgradeId: upgrade.id,
        ticketId,
      });
    }

    // Send email to attendee
    let emailSent = false;
    try {
      const orderUrl = generateOrderUrl(ticketId);

      const emailResult = await sendVipUpgradeEmail({
        to: ticket.email,
        firstName: ticket.first_name,
        ticketId: ticketId,
        upgradeMode,
        upgradeStatus: status,
        amount: amount ?? null,
        currency: currency ?? null,
        stripePaymentUrl: stripePaymentLinkUrl,
        bankTransferReference,
        bankTransferDueDate: bankTransferDueDate ?? null,
        manageTicketUrl: orderUrl,
      });

      if (emailResult.success) {
        emailSent = true;

        // Mark email as sent
        await supabase
          .from('ticket_upgrades')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', upgrade.id);

        log.info('VIP upgrade email sent', {
          upgradeId: upgrade.id,
          ticketId,
          to: ticket.email,
        });
      } else {
        log.warn('VIP upgrade email failed', {
          upgradeId: upgrade.id,
          ticketId,
          error: emailResult.error,
        });
      }
    } catch (emailError) {
      log.error('Exception sending VIP upgrade email', emailError, {
        upgradeId: upgrade.id,
        ticketId,
      });
      // Don't fail the request if email fails
    }

    // Track analytics
    await serverAnalytics.track('vip_upgrade_initiated', ticket.email, {
      ticket_id: ticketId,
      upgrade_id: upgrade.id,
      from_tier: ticket.ticket_category,
      to_tier: 'vip',
      upgrade_mode: upgradeMode,
      upgrade_status: status,
      amount: amount ?? 0,
      currency: currency ?? 'N/A',
      email_sent: emailSent,
    });

    // Fetch updated upgrade record
    const { data: finalUpgrade } = await supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('id', upgrade.id)
      .single();

    // Build response
    const response: UpgradeToVipResponse = {
      success: true,
      upgrade: finalUpgrade as TicketUpgrade,
      emailSent,
    };

    if (stripePaymentLinkUrl) {
      response.paymentUrl = stripePaymentLinkUrl;
    }

    if (bankTransferReference) {
      response.bankTransferDetails = {
        reference: bankTransferReference,
        iban: BANK_TRANSFER_DETAILS.iban,
        accountHolder: BANK_TRANSFER_DETAILS.accountHolder,
        bank: BANK_TRANSFER_DETAILS.bank,
        dueDate: bankTransferDueDate!,
        amount: amount!,
        currency: currency!,
      };
    }

    log.info('VIP upgrade request completed', {
      upgradeId: upgrade.id,
      ticketId,
      status,
      emailSent,
    });

    return res.status(200).json(response);

  } catch (error) {
    log.error('Unexpected error in VIP upgrade', error, {
      ticketId,
      type: 'system',
      severity: 'critical',
    });

    serverAnalytics.captureException(error, {
      distinctId: 'admin',
      type: 'system',
      severity: 'critical',
      flow: 'vip_upgrade',
    });

    return res.status(500).json({ error: 'Internal server error' });
  }
}
