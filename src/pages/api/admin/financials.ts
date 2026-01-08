/**
 * Admin Financials API
 * GET /api/admin/financials - Get financial statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Financials API');

/**
 * Fetch Stripe fees for a list of payment intent IDs
 * Returns a map of payment_intent_id -> fee (in cents)
 */
async function getStripeFees(paymentIntentIds: string[]): Promise<Map<string, number>> {
  const stripe = getStripeClient();
  const feeMap = new Map<string, number>();

  // Filter out empty/null IDs
  const validIds = paymentIntentIds.filter((id) => id && id.trim() !== '');

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < validIds.length; i += batchSize) {
    const batch = validIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (paymentIntentId) => {
        try {
          // Fetch the payment intent to get the latest charge
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
          });

          const charge = paymentIntent.latest_charge;
          if (charge && typeof charge !== 'string' && charge.balance_transaction) {
            // Fetch the balance transaction to get the fee
            const balanceTransactionId =
              typeof charge.balance_transaction === 'string'
                ? charge.balance_transaction
                : charge.balance_transaction.id;

            const balanceTransaction =
              await stripe.balanceTransactions.retrieve(balanceTransactionId);
            feeMap.set(paymentIntentId, balanceTransaction.fee);
          }
        } catch (err) {
          // Log but don't fail - some payments might not have fees (e.g., complimentary)
          log.warn('Could not fetch fee for payment intent', { paymentIntentId, error: err });
        }
      })
    );
  }

  return feeMap;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const token = req.cookies.admin_token;
    if (!verifyAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();

    // Get all tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching tickets', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }

    // Get payment intent IDs for confirmed tickets (for Stripe fee lookup)
    const confirmedPaymentIntentIds = tickets
      .filter((t) => t.status === 'confirmed' && t.stripe_payment_intent_id)
      .map((t) => t.stripe_payment_intent_id as string);

    // Fetch actual Stripe fees
    const stripeFees = await getStripeFees(confirmedPaymentIntentIds);

    // Calculate financial statistics
    let totalStripeFees = 0;
    const totalRevenue = tickets.reduce((sum, ticket) => {
      if (ticket.status === 'confirmed') {
        // Add up Stripe fees for this ticket
        if (ticket.stripe_payment_intent_id && stripeFees.has(ticket.stripe_payment_intent_id)) {
          totalStripeFees += stripeFees.get(ticket.stripe_payment_intent_id)!;
        }
        return sum + ticket.amount_paid;
      }
      return sum;
    }, 0);

    const totalRefunded = tickets.reduce((sum, ticket) => {
      if (ticket.status === 'refunded') {
        return sum + ticket.amount_paid;
      }
      return sum;
    }, 0);

    const ticketsByStatus = tickets.reduce((acc: Record<string, number>, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    const ticketsByType = tickets.reduce(
      (acc: Record<string, { count: number; revenue: number }>, ticket) => {
        if (!acc[ticket.ticket_type]) {
          acc[ticket.ticket_type] = { count: 0, revenue: 0 };
        }
        acc[ticket.ticket_type].count += 1;
        if (ticket.status === 'confirmed') {
          acc[ticket.ticket_type].revenue += ticket.amount_paid;
        }
        return acc;
      },
      {}
    );

    const ticketsByCategory = tickets.reduce(
      (acc: Record<string, { count: number; revenue: number }>, ticket) => {
        if (!acc[ticket.ticket_category]) {
          acc[ticket.ticket_category] = { count: 0, revenue: 0 };
        }
        acc[ticket.ticket_category].count += 1;
        if (ticket.status === 'confirmed') {
          acc[ticket.ticket_category].revenue += ticket.amount_paid;
        }
        return acc;
      },
      {}
    );

    const ticketsByStage = tickets.reduce(
      (acc: Record<string, { count: number; revenue: number }>, ticket) => {
        if (!acc[ticket.ticket_stage]) {
          acc[ticket.ticket_stage] = { count: 0, revenue: 0 };
        }
        acc[ticket.ticket_stage].count += 1;
        if (ticket.status === 'confirmed') {
          acc[ticket.ticket_stage].revenue += ticket.amount_paid;
        }
        return acc;
      },
      {}
    );

    // Categorize by sales channel and payment method
    // Structure:
    // - individual: Regular individual purchases
    //   - stripe: Paid via Stripe checkout
    //   - bank_transfer: Paid via bank transfer (if any)
    // - b2b: B2B/corporate sales
    //   - stripe: Paid via Stripe payment link
    //   - bank_transfer: Paid via bank transfer
    // - complimentary: Free tickets (amount_paid = 0)
    const revenueBreakdown = {
      individual: {
        total: { count: 0, revenue: 0, fees: 0 },
        stripe: { count: 0, revenue: 0, fees: 0 },
        bank_transfer: { count: 0, revenue: 0, fees: 0 },
      },
      b2b: {
        total: { count: 0, revenue: 0, fees: 0 },
        stripe: { count: 0, revenue: 0, fees: 0 },
        bank_transfer: { count: 0, revenue: 0, fees: 0 },
      },
      complimentary: { count: 0 },
    };

    for (const ticket of tickets) {
      if (ticket.status !== 'confirmed') continue;

      const metadata = ticket.metadata as Record<string, unknown> | null;
      const isB2B = ticket.stripe_session_id?.startsWith('b2b_') || metadata?.isB2B === true;
      const isComplimentary = ticket.amount_paid === 0;

      // Get Stripe fee for this ticket
      const fee = ticket.stripe_payment_intent_id && stripeFees.has(ticket.stripe_payment_intent_id)
        ? stripeFees.get(ticket.stripe_payment_intent_id)!
        : 0;

      if (isComplimentary) {
        // Free ticket - complimentary
        revenueBreakdown.complimentary.count += 1;
      } else if (isB2B) {
        // B2B sale
        revenueBreakdown.b2b.total.count += 1;
        revenueBreakdown.b2b.total.revenue += ticket.amount_paid;
        revenueBreakdown.b2b.total.fees += fee;

        if (metadata?.paymentType === 'bank_transfer') {
          revenueBreakdown.b2b.bank_transfer.count += 1;
          revenueBreakdown.b2b.bank_transfer.revenue += ticket.amount_paid;
        } else {
          revenueBreakdown.b2b.stripe.count += 1;
          revenueBreakdown.b2b.stripe.revenue += ticket.amount_paid;
          revenueBreakdown.b2b.stripe.fees += fee;
        }
      } else {
        // Individual sale
        revenueBreakdown.individual.total.count += 1;
        revenueBreakdown.individual.total.revenue += ticket.amount_paid;
        revenueBreakdown.individual.total.fees += fee;

        // Check payment method for individual (most will be Stripe)
        if (metadata?.paymentType === 'bank_transfer') {
          revenueBreakdown.individual.bank_transfer.count += 1;
          revenueBreakdown.individual.bank_transfer.revenue += ticket.amount_paid;
        } else {
          revenueBreakdown.individual.stripe.count += 1;
          revenueBreakdown.individual.stripe.revenue += ticket.amount_paid;
          revenueBreakdown.individual.stripe.fees += fee;
        }
      }
    }

    // Get B2B invoice totals for additional context
    const { data: b2bInvoices } = await supabase
      .from('b2b_invoices')
      .select('id, status, total_amount, payment_method')
      .in('status', ['paid', 'sent', 'draft']);

    const b2bSummary = {
      totalInvoices: b2bInvoices?.length || 0,
      paidInvoices: b2bInvoices?.filter(inv => inv.status === 'paid').length || 0,
      pendingInvoices: b2bInvoices?.filter(inv => inv.status === 'sent').length || 0,
      draftInvoices: b2bInvoices?.filter(inv => inv.status === 'draft').length || 0,
      paidRevenue: b2bInvoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0) || 0,
      pendingRevenue: b2bInvoices?.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total_amount, 0) || 0,
    };

    // Get sponsorship revenue data
    const { data: sponsorshipDeals } = await supabase
      .from('sponsorship_deals')
      .select(`
        id,
        status,
        currency,
        tier_id,
        sponsorship_invoices (
          total_amount,
          currency
        )
      `)
      .neq('status', 'cancelled');

    // Calculate sponsorship summary by currency
    const sponsorshipSummary = {
      totalDeals: sponsorshipDeals?.length || 0,
      paidDeals: sponsorshipDeals?.filter(d => d.status === 'paid').length || 0,
      pendingDeals: sponsorshipDeals?.filter(d => ['invoiced', 'invoice_sent'].includes(d.status)).length || 0,
      revenueByCurrency: {
        CHF: {
          paid: 0,
          pending: 0,
        },
        EUR: {
          paid: 0,
          pending: 0,
        },
      },
      byTier: {} as Record<string, { count: number; revenueCHF: number; revenueEUR: number }>,
    };

    for (const deal of sponsorshipDeals || []) {
      const invoice = Array.isArray(deal.sponsorship_invoices)
        ? deal.sponsorship_invoices[0]
        : deal.sponsorship_invoices;
      const amount = invoice?.total_amount || 0;
      const currency = deal.currency as 'CHF' | 'EUR';

      // Track revenue by status and currency
      if (deal.status === 'paid') {
        sponsorshipSummary.revenueByCurrency[currency].paid += amount;
      } else if (['invoiced', 'invoice_sent'].includes(deal.status)) {
        sponsorshipSummary.revenueByCurrency[currency].pending += amount;
      }

      // Track by tier
      const tierId = deal.tier_id;
      if (!sponsorshipSummary.byTier[tierId]) {
        sponsorshipSummary.byTier[tierId] = { count: 0, revenueCHF: 0, revenueEUR: 0 };
      }
      sponsorshipSummary.byTier[tierId].count += 1;
      if (deal.status === 'paid') {
        if (currency === 'CHF') {
          sponsorshipSummary.byTier[tierId].revenueCHF += amount;
        } else {
          sponsorshipSummary.byTier[tierId].revenueEUR += amount;
        }
      }
    }

    // Generate ticket purchases over time (daily aggregation for confirmed tickets)
    const purchasesOverTime = tickets
      .filter((t) => t.status === 'confirmed' && t.created_at)
      .reduce(
        (acc: Record<string, { date: string; count: number; revenue: number }>, ticket) => {
          const date = new Date(ticket.created_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { date, count: 0, revenue: 0 };
          }
          acc[date].count += 1;
          acc[date].revenue += ticket.amount_paid;
          return acc;
        },
        {}
      );

    // Convert to sorted array and add cumulative totals
    const purchasesTimeSeries = Object.values(purchasesOverTime)
      .sort((a, b) => a.date.localeCompare(b.date))
      .reduce(
        (acc: Array<{ date: string; count: number; revenue: number; cumulative: number; cumulativeRevenue: number }>, item, index) => {
          const prevCumulative = index > 0 ? acc[index - 1].cumulative : 0;
          const prevCumulativeRevenue = index > 0 ? acc[index - 1].cumulativeRevenue : 0;
          acc.push({
            ...item,
            cumulative: prevCumulative + item.count,
            cumulativeRevenue: prevCumulativeRevenue + item.revenue,
          });
          return acc;
        },
        []
      );

    return res.status(200).json({
      summary: {
        totalTickets: tickets.length,
        confirmedTickets: ticketsByStatus.confirmed || 0,
        cancelledTickets: ticketsByStatus.cancelled || 0,
        refundedTickets: ticketsByStatus.refunded || 0,
        pendingTickets: ticketsByStatus.pending || 0,
        grossRevenue: totalRevenue,
        totalStripeFees,
        netRevenue: totalRevenue - totalStripeFees,
        totalRefunded,
        // Keep legacy field for backward compatibility
        totalRevenue,
      },
      byStatus: ticketsByStatus,
      byType: ticketsByType,
      byCategory: ticketsByCategory,
      byStage: ticketsByStage,
      revenueBreakdown,
      b2bSummary,
      sponsorshipSummary,
      purchasesTimeSeries,
    });
  } catch (error) {
    log.error('Error fetching financials', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
