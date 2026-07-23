/**
 * Ticket Apparel Preferences API (User-facing)
 * POST /api/tickets/[id]/apparel
 * Allows ticket owners to save their t-shirt (and, for VIPs, hoodie) size
 * preferences using their secure token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyOrderToken } from '@/lib/auth/orderToken';
import { createServiceRoleClient } from '@/lib/supabase';
import { apparelPreferencesSchema } from '@/lib/validations/apparel';
import { logger } from '@/lib/logger';

const log = logger.scope('Ticket Apparel API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const result = apparelPreferencesSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }

    const { token, tshirtSize, hoodieSize } = result.data;

    // Verify the token and extract ticket ID
    const tokenTicketId = verifyOrderToken(token);

    if (!tokenTicketId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Ensure the token matches the ticket being updated
    if (tokenTicketId !== id) {
      return res.status(403).json({ error: 'You do not have permission to update this ticket' });
    }

    const supabase = createServiceRoleClient();

    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('id, ticket_category')
      .eq('id', id)
      .single();

    if (fetchError || !ticket) {
      log.error('Error fetching ticket', fetchError, { ticketId: id });
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Hoodies are part of the VIP package only
    const isVip = ticket.ticket_category === 'vip';
    if (hoodieSize && !isVip) {
      return res.status(400).json({ error: 'Hoodie size is only available for VIP tickets' });
    }

    const { data: preferences, error: upsertError } = await supabase
      .from('ticket_apparel_preferences')
      .upsert(
        {
          ticket_id: id,
          tshirt_size: tshirtSize,
          hoodie_size: isVip ? (hoodieSize ?? null) : null,
        },
        { onConflict: 'ticket_id' }
      )
      .select()
      .single();

    if (upsertError || !preferences) {
      log.error('Error saving apparel preferences', upsertError, { ticketId: id });
      return res.status(500).json({ error: 'Failed to save apparel preferences' });
    }

    return res.status(200).json({
      success: true,
      preferences: {
        tshirtSize: preferences.tshirt_size,
        hoodieSize: preferences.hoodie_size,
      },
    });
  } catch (error) {
    log.error('Error saving apparel preferences', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
