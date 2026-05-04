/**
 * VIP Perks List API
 * GET /api/admin/vip-perks — List all VIP perks with ticket info and stats
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { listVipPerks } from '@/lib/vip-perks';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { VipPerksStats } from '@/lib/types/vip-perks';

const log = logger.scope('VipPerksAPI');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createServiceRoleClient();

    // Fetch perks and stats in parallel
    const [perks, vipTicketsResult, emailsResult] = await Promise.all([
      listVipPerks(),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('ticket_category', 'vip')
        .eq('status', 'confirmed'),
      supabase
        .from('vip_perk_emails')
        .select('id', { count: 'exact', head: true }),
    ]);

    const totalVipTickets = vipTicketsResult.count || 0;
    const totalEmailsSent = emailsResult.count || 0;
    const perksRedeemed = perks.filter(p => p.current_redemptions > 0).length;

    const stats: VipPerksStats = {
      total_vip_tickets: totalVipTickets,
      perks_created: perks.length,
      perks_redeemed: perksRedeemed,
      emails_sent: totalEmailsSent,
      pending: totalVipTickets - perks.length,
    };

    return res.status(200).json({ perks, stats });
  } catch (error) {
    log.error('Failed to list VIP perks', error as Error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
