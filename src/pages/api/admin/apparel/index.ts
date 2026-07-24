/**
 * Admin Apparel Overview API
 * GET /api/admin/apparel - Ticket holders + speakers with apparel size status,
 * plus aggregated size counts for order reconciliation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { APPAREL_SIZES } from '@/lib/types/ticket-constants';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Apparel API');

export interface ApparelTicketRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_category: string;
  created_at: string;
  apparel_reminder_sent_at: string | null;
  tshirt_size: string | null;
  hoodie_size: string | null;
  /** True when required sizes are still missing (hoodie counts only for VIPs) */
  missing: boolean;
}

export interface ApparelSpeakerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  tshirt_size: string | null;
  hoodie_size: string | null;
}

export interface ApparelStats {
  totalTickets: number;
  withTshirt: number;
  missingTshirt: number;
  vipTotal: number;
  vipWithHoodie: number;
  vipMissingHoodie: number;
  tshirtCounts: Record<string, number>;
  hoodieCounts: Record<string, number>;
}

export interface ApparelSpeakerStats {
  total: number;
  withTshirt: number;
  withHoodie: number;
  tshirtCounts: Record<string, number>;
  hoodieCounts: Record<string, number>;
}

export interface ApparelOverviewResponse {
  tickets: ApparelTicketRow[];
  stats: ApparelStats;
  speakers: ApparelSpeakerRow[];
  speakerStats: ApparelSpeakerStats;
}

const emptySizeCounts = (): Record<string, number> =>
  Object.fromEntries(APPAREL_SIZES.map((size) => [size, 0]));

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApparelOverviewResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();

    // Only confirmed tickets get apparel
    const [ticketsResult, preferencesResult, speakersResult] = await Promise.all([
      supabase
        .from('tickets')
        .select('id, first_name, last_name, email, ticket_category, created_at, apparel_reminder_sent_at')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false }),
      supabase.from('ticket_apparel_preferences').select('ticket_id, tshirt_size, hoodie_size'),
      supabase
        .from('cfp_speakers')
        .select('id, first_name, last_name, email, tshirt_size, hoodie_size')
        .eq('is_visible', true)
        .order('last_name', { ascending: true }),
    ]);

    if (ticketsResult.error) {
      log.error('Error fetching tickets', ticketsResult.error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
    if (preferencesResult.error) {
      log.error('Error fetching apparel preferences', preferencesResult.error);
      return res.status(500).json({ error: 'Failed to fetch apparel preferences' });
    }
    if (speakersResult.error) {
      log.error('Error fetching speakers', speakersResult.error);
      return res.status(500).json({ error: 'Failed to fetch speakers' });
    }

    const preferencesByTicket = new Map(
      (preferencesResult.data ?? []).map((pref) => [pref.ticket_id, pref])
    );

    const stats: ApparelStats = {
      totalTickets: 0,
      withTshirt: 0,
      missingTshirt: 0,
      vipTotal: 0,
      vipWithHoodie: 0,
      vipMissingHoodie: 0,
      tshirtCounts: emptySizeCounts(),
      hoodieCounts: emptySizeCounts(),
    };

    const tickets: ApparelTicketRow[] = (ticketsResult.data ?? []).map((ticket) => {
      const pref = preferencesByTicket.get(ticket.id);
      const tshirtSize = pref?.tshirt_size ?? null;
      const hoodieSize = pref?.hoodie_size ?? null;
      const isVip = ticket.ticket_category === 'vip';

      stats.totalTickets++;
      if (tshirtSize) {
        stats.withTshirt++;
        stats.tshirtCounts[tshirtSize] = (stats.tshirtCounts[tshirtSize] ?? 0) + 1;
      } else {
        stats.missingTshirt++;
      }
      if (isVip) {
        stats.vipTotal++;
        if (hoodieSize) {
          stats.vipWithHoodie++;
          stats.hoodieCounts[hoodieSize] = (stats.hoodieCounts[hoodieSize] ?? 0) + 1;
        } else {
          stats.vipMissingHoodie++;
        }
      }

      return {
        id: ticket.id,
        first_name: ticket.first_name,
        last_name: ticket.last_name,
        email: ticket.email,
        ticket_category: ticket.ticket_category,
        created_at: ticket.created_at,
        apparel_reminder_sent_at: ticket.apparel_reminder_sent_at,
        tshirt_size: tshirtSize,
        hoodie_size: hoodieSize,
        missing: !tshirtSize || (isVip && !hoodieSize),
      };
    });

    const speakers = (speakersResult.data ?? []) as ApparelSpeakerRow[];
    const speakerStats: ApparelSpeakerStats = {
      total: speakers.length,
      withTshirt: 0,
      withHoodie: 0,
      tshirtCounts: emptySizeCounts(),
      hoodieCounts: emptySizeCounts(),
    };
    for (const speaker of speakers) {
      if (speaker.tshirt_size) {
        speakerStats.withTshirt++;
        speakerStats.tshirtCounts[speaker.tshirt_size] =
          (speakerStats.tshirtCounts[speaker.tshirt_size] ?? 0) + 1;
      }
      if (speaker.hoodie_size) {
        speakerStats.withHoodie++;
        speakerStats.hoodieCounts[speaker.hoodie_size] =
          (speakerStats.hoodieCounts[speaker.hoodie_size] ?? 0) + 1;
      }
    }

    return res.status(200).json({ tickets, stats, speakers, speakerStats });
  } catch (error) {
    log.error('Admin apparel API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
