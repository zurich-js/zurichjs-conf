/**
 * Admin After Party Overview API
 * GET /api/admin/after-party - Everyone expected at the VIP after party
 * (speakers who RSVP'd, their plus ones, admin-added guests, and confirmed
 * VIP ticket holders), de-duplicated by email, with headcount vs. venue
 * capacity. Read-only: nothing is blocked when over capacity.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import { AFTER_PARTY_CAPACITY } from '@/config/after-party';
import { buildAfterPartyRoster } from '@/lib/after-party';
import type {
  AfterPartyGuestInput,
  AfterPartyOverviewResponse,
  AfterPartySpeakerInput,
  AfterPartyTicketInput,
} from '@/lib/types/after-party';
import { logger } from '@/lib/logger';
import type { SpeakerLogisticsRow } from '@/lib/types/speaker-logistics';

const log = logger.scope('Admin After Party API');

interface GuestQueryRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  guest_type: string;
  dietary_restrictions: string | null;
  admin_notes: string | null;
  related_speaker: { first_name: string; last_name: string } | null;
}

interface TicketQueryRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  amount_paid: number;
  metadata: unknown;
  checked_in: boolean | null;
}

function readPaymentType(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const value = (metadata as Record<string, unknown>).paymentType;
  return typeof value === 'string' ? value : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Attendee emails, dietary needs, and notes — never let a browser or CDN keep a copy
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const supabase = createServiceRoleClient();

    const [speakers, logisticsResult, guestsResult, ticketsResult] = await Promise.all([
      getAdminSpeakersWithSubmissions('program'),
      supabase.from('cfp_speaker_logistics').select('*'),
      supabase
        .from('speaker_activity_guests')
        .select(
          'id, first_name, last_name, email, guest_type, dietary_restrictions, admin_notes, related_speaker:cfp_speakers(first_name, last_name)'
        )
        .eq('activity', 'after_party'),
      supabase
        .from('tickets')
        .select('id, first_name, last_name, email, company, amount_paid, metadata, checked_in')
        .eq('ticket_category', 'vip')
        .eq('status', 'confirmed'),
    ]);

    if (logisticsResult.error) {
      log.error('Error fetching speaker logistics rows', logisticsResult.error);
      res.status(500).json({ error: 'Failed to fetch speaker logistics' });
      return;
    }
    if (guestsResult.error) {
      log.error('Error fetching after-party guests', guestsResult.error);
      res.status(500).json({ error: 'Failed to fetch after-party guests' });
      return;
    }
    if (ticketsResult.error) {
      log.error('Error fetching VIP tickets', ticketsResult.error);
      res.status(500).json({ error: 'Failed to fetch VIP tickets' });
      return;
    }

    const logisticsBySpeaker = new Map<string, SpeakerLogisticsRow>(
      (logisticsResult.data ?? []).map((row) => [row.speaker_id, row])
    );

    const speakerInputs: AfterPartySpeakerInput[] = speakers.map((speaker) => {
      const logistics = logisticsBySpeaker.get(speaker.id);
      // Only submitted forms count as answers — a draft row is still "unanswered"
      const answered = Boolean(logistics?.submitted_at);
      return {
        id: speaker.id,
        first_name: speaker.first_name,
        last_name: speaker.last_name,
        email: speaker.email,
        attending_after_party: answered ? logistics!.attending_after_party : null,
        after_party_plus_one: answered ? logistics!.after_party_plus_one : null,
        after_party_plus_one_first_name: logistics?.after_party_plus_one_first_name ?? null,
        after_party_plus_one_last_name: logistics?.after_party_plus_one_last_name ?? null,
        after_party_plus_one_email: logistics?.after_party_plus_one_email ?? null,
        dietary_restrictions: logistics?.dietary_restrictions ?? null,
      };
    });

    const guestInputs: AfterPartyGuestInput[] = ((guestsResult.data ?? []) as unknown as GuestQueryRow[]).map(
      (guest) => ({
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        email: guest.email,
        guest_type: guest.guest_type,
        related_speaker_name: guest.related_speaker
          ? `${guest.related_speaker.first_name} ${guest.related_speaker.last_name}`.trim()
          : null,
        dietary_restrictions: guest.dietary_restrictions,
        admin_notes: guest.admin_notes,
      })
    );

    const ticketInputs: AfterPartyTicketInput[] = ((ticketsResult.data ?? []) as TicketQueryRow[]).map(
      (ticket) => ({
        id: ticket.id,
        first_name: ticket.first_name,
        last_name: ticket.last_name,
        email: ticket.email,
        company: ticket.company,
        amount_paid: ticket.amount_paid,
        payment_type: readPaymentType(ticket.metadata),
        checked_in: ticket.checked_in === true,
      })
    );

    const roster = buildAfterPartyRoster(
      { speakers: speakerInputs, guests: guestInputs, tickets: ticketInputs },
      AFTER_PARTY_CAPACITY
    );

    if (roster.stats.over_capacity) {
      log.warn('After party roster is over venue capacity', {
        headcount: roster.stats.headcount,
        capacity: roster.stats.capacity,
        overBy: roster.stats.over_by,
      });
    }

    const response: AfterPartyOverviewResponse = {
      ...roster,
      generated_at: new Date().toISOString(),
    };
    res.status(200).json(response);
    return;
  } catch (error) {
    log.error('Error building after party overview', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
}
