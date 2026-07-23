/**
 * Admin Verifications API
 * GET /api/admin/verifications - List verification requests, each enriched
 * with its ticket purchase status (session-id match first, email fallback)
 * so admins can see who still needs a follow-up.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { enrichVerificationsWithTickets, type TicketForMatching } from '@/lib/verifications';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Verifications API');

const TICKET_COLUMNS = 'id, email, status, ticket_category, stripe_session_id, created_at';

async function fetchCandidateTickets(
  supabase: ReturnType<typeof createServiceRoleClient>,
  emails: string[],
  sessionIds: string[]
): Promise<TicketForMatching[]> {
  // Three overlapping candidate sets, deduped by id:
  // - exact email matches (original + lowercased spellings)
  // - session-id matches (authoritative, written by the Stripe webhook)
  // - all student/unemployed tickets (small, capped set) so discounted
  //   purchases still match when the ticket email differs in casing
  const [byEmail, bySession, byCategory] = await Promise.all([
    emails.length > 0
      ? supabase.from('tickets').select(TICKET_COLUMNS).in('email', emails)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length > 0
      ? supabase.from('tickets').select(TICKET_COLUMNS).in('stripe_session_id', sessionIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('tickets').select(TICKET_COLUMNS).in('ticket_category', ['student', 'unemployed']),
  ]);

  const firstError = byEmail.error || bySession.error || byCategory.error;
  if (firstError) {
    throw firstError;
  }

  const seen = new Map<string, TicketForMatching>();
  for (const ticket of [...(byEmail.data ?? []), ...(bySession.data ?? []), ...(byCategory.data ?? [])]) {
    seen.set(ticket.id, ticket);
  }
  return [...seen.values()];
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
    const { status } = req.query;

    let query = supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: verifications, error } = await query;

    if (error) {
      log.error('Error fetching verifications', error);
      return res.status(500).json({ error: 'Failed to fetch verifications' });
    }

    const emails = [
      ...new Set(
        (verifications ?? []).flatMap((v) => [v.email, v.email.trim().toLowerCase()])
      ),
    ];
    const sessionIds = (verifications ?? [])
      .map((v) => v.stripe_session_id)
      .filter((id): id is string => Boolean(id));

    let tickets: TicketForMatching[];
    try {
      tickets = await fetchCandidateTickets(supabase, emails, sessionIds);
    } catch (ticketError) {
      log.error('Error fetching tickets for verification matching', ticketError);
      return res.status(500).json({ error: 'Failed to fetch ticket status' });
    }

    return res.status(200).json({
      verifications: enrichVerificationsWithTickets(verifications ?? [], tickets),
    });
  } catch (error) {
    log.error('Admin verifications API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
