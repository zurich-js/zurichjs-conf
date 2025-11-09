/**
 * Google Wallet Pass API Endpoint
 * Generates Google Wallet pass URLs and redirects to "Save to Google Wallet"
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase';
import { createGoogleWalletPass, areWalletPassesConfigured } from '@/lib/wallet';
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

  // Check if Google Wallet is configured
  const { google: isConfigured } = areWalletPassesConfigured();

  if (!isConfigured) {
    res.status(503).json({
      error: 'Google Wallet pass generation is not yet configured',
      message: 'This feature requires Google Cloud setup. Please contact support.',
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

    // Generate Google Wallet pass URL
    const typedTicket = ticket as {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      ticket_type: string;
    };
    const result = await createGoogleWalletPass({
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

    if (!result.success || !result.url) {
      res.status(500).json({ error: result.error || 'Failed to generate Google Wallet pass' });
      return;
    }

    // Redirect to Google Wallet "Save" URL
    res.redirect(302, result.url);
  } catch (error) {
    console.error('[API] Error generating Google Wallet pass:', error);
    res.status(500).json({
      error: 'Failed to generate Google Wallet pass',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
