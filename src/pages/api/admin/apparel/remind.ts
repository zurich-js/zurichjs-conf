/**
 * Admin Apparel Reminder API
 * POST /api/admin/apparel/remind - Bulk-send apparel size reminder emails to
 * selected ticket holders. Tickets that already have all required sizes are
 * skipped; successful sends stamp tickets.apparel_reminder_sent_at.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { generateOrderUrl } from '@/lib/auth/orderToken';
import { sendApparelReminderEmailsQueued, type ApparelReminderData } from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Apparel Remind API');

// Bulk sends are rate limited to ~1.67 emails/sec, so large batches need time
export const config = {
  maxDuration: 300,
};

const remindSchema = z.object({
  ticketIds: z.array(z.string().uuid()).min(1).max(200),
  customMessage: z.string().max(2000).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = remindSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }

    const { ticketIds, customMessage } = result.data;
    const supabase = createServiceRoleClient();

    const [ticketsResult, preferencesResult] = await Promise.all([
      supabase
        .from('tickets')
        .select('id, first_name, last_name, email, ticket_category, status')
        .in('id', ticketIds)
        .eq('status', 'confirmed'),
      supabase
        .from('ticket_apparel_preferences')
        .select('ticket_id, tshirt_size, hoodie_size')
        .in('ticket_id', ticketIds),
    ]);

    if (ticketsResult.error) {
      log.error('Error fetching tickets', ticketsResult.error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
    if (preferencesResult.error) {
      log.error('Error fetching apparel preferences', preferencesResult.error);
      return res.status(500).json({ error: 'Failed to fetch apparel preferences' });
    }

    const preferencesByTicket = new Map(
      (preferencesResult.data ?? []).map((pref) => [pref.ticket_id, pref])
    );

    // Only email holders who are actually missing something
    const emails: ApparelReminderData[] = [];
    const skipped: string[] = [];
    for (const ticket of ticketsResult.data ?? []) {
      const pref = preferencesByTicket.get(ticket.id);
      const isVip = ticket.ticket_category === 'vip';
      const missingTshirt = !pref?.tshirt_size;
      const missingHoodie = isVip && !pref?.hoodie_size;

      if (!missingTshirt && !missingHoodie) {
        skipped.push(ticket.id);
        continue;
      }

      emails.push({
        to: ticket.email,
        firstName: ticket.first_name,
        ticketId: ticket.id,
        manageTicketUrl: generateOrderUrl(ticket.id),
        isVip,
        missingTshirt,
        missingHoodie,
        customMessage,
      });
    }

    const results = emails.length > 0 ? await sendApparelReminderEmailsQueued(emails) : [];

    const sentTicketIds = results.filter((r) => r.success).map((r) => r.ticketId);
    if (sentTicketIds.length > 0) {
      const { error: stampError } = await supabase
        .from('tickets')
        .update({ apparel_reminder_sent_at: new Date().toISOString() })
        .in('id', sentTicketIds);

      if (stampError) {
        // Emails went out; a failed stamp shouldn't fail the request
        log.error('Failed to stamp apparel_reminder_sent_at', stampError, {
          ticketIds: sentTicketIds,
        });
      }
    }

    const failed = results.filter((r) => !r.success);
    log.info('Apparel reminder batch completed', {
      requested: ticketIds.length,
      sent: sentTicketIds.length,
      failed: failed.length,
      skipped: skipped.length,
    });

    return res.status(200).json({
      success: true,
      requested: ticketIds.length,
      sent: sentTicketIds.length,
      failed: failed.length,
      skipped: skipped.length,
      failures: failed.map((f) => ({ ticketId: f.ticketId, email: f.email, error: f.error })),
    });
  } catch (error) {
    log.error('Error sending apparel reminders', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
