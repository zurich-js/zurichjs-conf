/**
 * Admin Ticket Apparel API
 * GET   /api/admin/tickets/[id]/apparel - Read the ticket holder's apparel sizes
 * PATCH /api/admin/tickets/[id]/apparel - Update the ticket holder's t-shirt size
 *
 * Hoodie size is returned for context (VIP packages include one) but is only
 * editable by the ticket holder through the manage-order flow.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { adminApparelUpdateSchema, ticketIdSchema } from '@/lib/validations/apparel';
import type { TicketApparel } from '@/lib/types/ticket-apparel';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Ticket Apparel API');

type ApiResponse = TicketApparel | { error: string; issues?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const idResult = ticketIdSchema.safeParse(req.query.id);
  if (!idResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: idResult.error.issues,
    });
  }
  const id = idResult.data;

  try {
    const supabase = createServiceRoleClient();

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (req.method === 'GET') {
      const { data: preferences, error: fetchError } = await supabase
        .from('ticket_apparel_preferences')
        .select('tshirt_size, hoodie_size')
        .eq('ticket_id', id)
        .maybeSingle();

      if (fetchError) {
        log.error('Error fetching apparel preferences', fetchError, { ticketId: id });
        return res.status(500).json({ error: 'Failed to fetch apparel preferences' });
      }

      return res.status(200).json({
        tshirtSize: preferences?.tshirt_size ?? null,
        hoodieSize: preferences?.hoodie_size ?? null,
      });
    }

    const result = adminApparelUpdateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }

    // Only tshirt_size is in the payload, so an existing hoodie_size is preserved
    const { data: preferences, error: upsertError } = await supabase
      .from('ticket_apparel_preferences')
      .upsert(
        { ticket_id: id, tshirt_size: result.data.tshirtSize },
        { onConflict: 'ticket_id' }
      )
      .select('tshirt_size, hoodie_size')
      .single();

    if (upsertError || !preferences) {
      log.error('Error updating apparel preferences', upsertError, { ticketId: id });
      return res.status(500).json({ error: 'Failed to update apparel preferences' });
    }

    log.info('Ticket t-shirt size updated by admin', {
      ticketId: id,
      tshirtSize: result.data.tshirtSize,
    });

    return res.status(200).json({
      tshirtSize: preferences.tshirt_size,
      hoodieSize: preferences.hoodie_size,
    });
  } catch (error) {
    log.error('Admin ticket apparel API error', error, { ticketId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
