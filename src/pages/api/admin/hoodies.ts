/**
 * Admin Hoodie Allocation API
 * GET /api/admin/hoodies - Who gets a VIP hoodie: program speakers, people who
 * bought a VIP ticket, and people who paid for a VIP upgrade. Complimentary
 * VIP tickets and complimentary upgrades are listed separately as excluded,
 * except sponsor comps, which still qualify.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import {
  buildHoodieAllocation,
  type HoodieAllocation,
  type HoodieSpeakerInput,
  type HoodieTicketInput,
  type HoodieUpgradeInput,
} from '@/lib/hoodies';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Hoodies API');

export interface HoodieAllocationResponse extends HoodieAllocation {
  generated_at: string;
}

interface TicketQueryRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  amount_paid: number;
  metadata: unknown;
  hoodie_handed_at: string | null;
}

function readString(metadata: unknown, field: string): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const value = (metadata as Record<string, unknown>)[field];
  return typeof value === 'string' && value ? value : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();

    const [speakers, ticketsResult, preferencesResult, upgradesResult] = await Promise.all([
      getAdminSpeakersWithSubmissions('program'),
      supabase
        .from('tickets')
        .select('id, first_name, last_name, email, amount_paid, metadata, hoodie_handed_at')
        .eq('ticket_category', 'vip')
        .eq('status', 'confirmed'),
      supabase.from('ticket_apparel_preferences').select('ticket_id, hoodie_size'),
      supabase.from('ticket_upgrades').select('id, upgrade_mode, status, admin_note').eq('to_tier', 'vip'),
    ]);

    if (ticketsResult.error) {
      log.error('Error fetching VIP tickets', ticketsResult.error);
      return res.status(500).json({ error: 'Failed to fetch VIP tickets' });
    }
    if (preferencesResult.error) {
      log.error('Error fetching apparel preferences', preferencesResult.error);
      return res.status(500).json({ error: 'Failed to fetch apparel preferences' });
    }
    if (upgradesResult.error) {
      log.error('Error fetching ticket upgrades', upgradesResult.error);
      return res.status(500).json({ error: 'Failed to fetch ticket upgrades' });
    }

    const hoodieSizeByTicket = new Map(
      (preferencesResult.data ?? []).map((pref) => [pref.ticket_id, pref.hoodie_size])
    );

    const speakerInputs: HoodieSpeakerInput[] = speakers.map((speaker) => ({
      id: speaker.id,
      first_name: speaker.first_name,
      last_name: speaker.last_name,
      email: speaker.email,
      hoodie_size: speaker.hoodie_size ?? null,
    }));

    const ticketInputs: HoodieTicketInput[] = ((ticketsResult.data ?? []) as TicketQueryRow[]).map((ticket) => ({
      id: ticket.id,
      first_name: ticket.first_name,
      last_name: ticket.last_name,
      email: ticket.email,
      amount_paid: ticket.amount_paid,
      payment_type: readString(ticket.metadata, 'paymentType'),
      complimentary_reason: readString(ticket.metadata, 'complimentaryReason'),
      upgrade_id: readString(ticket.metadata, 'upgrade_id'),
      upgraded_from: readString(ticket.metadata, 'upgraded_from'),
      hoodie_size: hoodieSizeByTicket.get(ticket.id) ?? null,
      hoodie_handed_at: ticket.hoodie_handed_at,
    }));

    const upgradeInputs: HoodieUpgradeInput[] = (upgradesResult.data ?? []) as HoodieUpgradeInput[];

    const allocation = buildHoodieAllocation({
      speakers: speakerInputs,
      tickets: ticketInputs,
      upgrades: upgradeInputs,
    });

    const response: HoodieAllocationResponse = { ...allocation, generated_at: new Date().toISOString() };
    return res.status(200).json(response);
  } catch (error) {
    log.error('Error building hoodie allocation', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
