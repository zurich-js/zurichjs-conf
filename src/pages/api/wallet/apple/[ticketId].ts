/**
 * Apple Wallet Pass API Endpoint
 * Generates and serves Apple Wallet (.pkpass) files for tickets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase';
import { createAppleWalletPass, areWalletPassesConfigured } from '@/lib/wallet';
import { getBaseUrl } from '@/lib/url';

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

  // Check if Apple Wallet is configured
  const { apple: isConfigured } = areWalletPassesConfigured();

  if (!isConfigured) {
    res.status(503).json({
      error: 'Apple Wallet pass generation is not yet configured',
      message: 'This feature requires Apple Developer certificates. Please contact support.',
    });
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

    // Generate Apple Wallet pass
    const typedTicket = ticket as {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      ticket_type: string;
    };
    const result = await createAppleWalletPass({
      ticketId: typedTicket.id,
      ticketHolderName: `${typedTicket.first_name} ${typedTicket.last_name}`,
      ticketHolderEmail: typedTicket.email,
      ticketType: typedTicket.ticket_type,
      eventName: 'ZurichJS Conference 2026',
      eventDate: new Date('2026-09-11T09:00:00+02:00'),
      venueName: 'Technopark Zürich',
      venueAddress: 'Technoparkstrasse 1, 8005 Zürich, Switzerland',
      qrCodeData: `${getBaseUrl(req)}/validate/${typedTicket.id}`,
    });

    if (!result.success || !result.passData) {
      res.status(500).json({ error: result.error || 'Failed to generate Apple Wallet pass' });
      return;
    }

    // Set headers for .pkpass file download
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="zurichjs-conference-ticket.pkpass"`
    );
    res.send(result.passData);
  } catch (error) {
    console.error('[API] Error generating Apple Wallet pass:', error);
    res.status(500).json({
      error: 'Failed to generate Apple Wallet pass',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
