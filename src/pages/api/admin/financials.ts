/**
 * Admin Financials API
 * GET /api/admin/financials - Get financial statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';

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
      console.error('Error fetching tickets:', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }

    // Calculate financial statistics
    const totalRevenue = tickets.reduce((sum, ticket) => {
      if (ticket.status === 'confirmed') {
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

    return res.status(200).json({
      summary: {
        totalTickets: tickets.length,
        confirmedTickets: ticketsByStatus.confirmed || 0,
        cancelledTickets: ticketsByStatus.cancelled || 0,
        refundedTickets: ticketsByStatus.refunded || 0,
        pendingTickets: ticketsByStatus.pending || 0,
        totalRevenue,
        totalRefunded,
        netRevenue: totalRevenue - totalRefunded,
      },
      byStatus: ticketsByStatus,
      byType: ticketsByType,
      byCategory: ticketsByCategory,
      byStage: ticketsByStage,
    });
  } catch (error) {
    console.error('Admin financials API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
