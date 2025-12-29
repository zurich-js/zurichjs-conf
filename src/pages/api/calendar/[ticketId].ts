/**
 * Calendar Download API Endpoint
 * Generates and serves .ics calendar files for tickets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase';
import { generateZurichJSConferenceCalendar } from '@/lib/calendar';
import { logger } from '@/lib/logger';

const log = logger.scope('Calendar API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { ticketId } = req.query;

  if (!ticketId || typeof ticketId !== 'string') {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }

  try {
    // Fetch ticket from database
    const supabase = createServiceRoleClient();
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Generate calendar event
    const typedTicket = ticket as { first_name: string; last_name: string; email: string };
    const ticketHolderName = `${typedTicket.first_name} ${typedTicket.last_name}`;
    const result = generateZurichJSConferenceCalendar(
      ticketHolderName,
      typedTicket.email
    );

    if (!result.success || !result.icsContent) {
      res.status(500).json({ error: result.error || 'Failed to generate calendar event' });
      return;
    }

    // Set headers for .ics file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="zurichjs-conference-2026.ics"`
    );
    res.setHeader('Cache-Control', 'no-cache');
    res.send(result.icsContent);
  } catch (error) {
    log.error('Error generating calendar', error);
    res.status(500).json({
      error: 'Failed to generate calendar',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
