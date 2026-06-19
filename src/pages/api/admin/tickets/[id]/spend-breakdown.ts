/**
 * Admin Ticket Spend Breakdown API
 * GET /api/admin/tickets/[id]/spend-breakdown
 *
 * Returns upgrade history, workshop bookings, and total spend breakdown
 * for a single ticket holder.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Ticket Spend Breakdown');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const supabase = createServiceRoleClient();

    // Fetch the ticket to get email and base cost
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, email, amount_paid, currency, status')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Fetch upgrade history and workshop registrations in parallel
    const [upgradesResult, workshopsByTicketId, workshopsByEmail] = await Promise.all([
      supabase
        .from('ticket_upgrades')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('workshop_registrations')
        .select('id, workshop_id, amount_paid, discount_amount, currency, status, created_at, workshops(title, date, start_time, end_time)')
        .eq('ticket_id', id)
        .neq('status', 'cancelled'),
      supabase
        .from('workshop_registrations')
        .select('id, workshop_id, amount_paid, discount_amount, currency, status, created_at, workshops(title, date, start_time, end_time)')
        .eq('email', ticket.email)
        .neq('status', 'cancelled'),
    ]);

    if (upgradesResult.error) {
      log.error('Error fetching upgrades', upgradesResult.error, { ticketId: id });
      return res.status(500).json({ error: 'Failed to fetch upgrade history' });
    }

    if (workshopsByTicketId.error || workshopsByEmail.error) {
      log.error('Error fetching workshop registrations', workshopsByTicketId.error || workshopsByEmail.error, { ticketId: id });
      return res.status(500).json({ error: 'Failed to fetch workshop bookings' });
    }

    // Deduplicate workshop registrations by id
    const seenIds = new Set<string>();
    const allWorkshopRows = [...(workshopsByTicketId.data || []), ...(workshopsByEmail.data || [])];
    const deduped = allWorkshopRows.filter((r) => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });

    const workshopBookings = deduped.map((r) => {
      const workshop = r.workshops as { title: string; date: string | null; start_time: string | null; end_time: string | null } | null;
      return {
        id: r.id,
        workshop_id: r.workshop_id,
        workshop_title: workshop?.title || 'Unknown Workshop',
        workshop_date: workshop?.date || null,
        workshop_start_time: workshop?.start_time || null,
        workshop_end_time: workshop?.end_time || null,
        amount_paid: r.amount_paid || 0,
        discount_amount: r.discount_amount || 0,
        currency: r.currency || 'CHF',
        status: r.status,
        created_at: r.created_at,
      };
    });

    // Compute spend breakdown
    const upgrades = upgradesResult.data || [];
    const ticketCost = ticket.status === 'confirmed' ? ticket.amount_paid : 0;
    const ticketCurrency = ticket.currency?.toUpperCase() || 'CHF';

    // Sum completed upgrade costs
    let upgradeCost = 0;
    let upgradeCurrency: string | null = null;
    for (const u of upgrades) {
      if (u.status === 'completed' && u.amount) {
        upgradeCost += u.amount;
        upgradeCurrency = u.currency?.toUpperCase() || ticketCurrency;
      }
    }

    // Sum confirmed workshop costs by currency
    const workshopCostMap: Record<string, number> = {};
    for (const w of workshopBookings) {
      if (w.status === 'confirmed' && w.amount_paid > 0) {
        const cur = w.currency.toUpperCase();
        workshopCostMap[cur] = (workshopCostMap[cur] || 0) + w.amount_paid;
      }
    }
    const workshopCosts = Object.entries(workshopCostMap).map(([currency, amount]) => ({ currency, amount }));

    // Compute total by currency
    const totalMap: Record<string, number> = {};
    totalMap[ticketCurrency] = (totalMap[ticketCurrency] || 0) + ticketCost;
    if (upgradeCost > 0 && upgradeCurrency) {
      totalMap[upgradeCurrency] = (totalMap[upgradeCurrency] || 0) + upgradeCost;
    }
    for (const w of workshopCosts) {
      totalMap[w.currency] = (totalMap[w.currency] || 0) + w.amount;
    }
    const totalByCurrency = Object.entries(totalMap).map(([currency, amount]) => ({ currency, amount }));

    return res.status(200).json({
      upgrades,
      workshopBookings,
      spendBreakdown: {
        ticketCost,
        ticketCurrency,
        upgradeCost,
        upgradeCurrency,
        workshopCosts,
        totalByCurrency,
      },
    });
  } catch (error) {
    log.error('Error fetching spend breakdown', error, { ticketId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
