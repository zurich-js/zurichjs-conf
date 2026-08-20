/**
 * Ticket Networking API
 * POST /api/tickets/[id]/networking
 * Lets a confirmed ticket holder publish or update their networking profile.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyOrderTokenClaimsForCurrentTicket } from '@/lib/auth/orderTokenServer';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';
import type { AttendeeNetworkingProfile, NetworkingSettings } from '@/lib/types/networking';
import {
  attendeeNetworkingProfileSchema,
  attendeeNetworkingUpdateSchema,
} from '@/lib/validations/networking';

const log = logger.scope('Ticket Networking API');

type NetworkingResponse = NetworkingSettings<AttendeeNetworkingProfile>;
type ErrorResponse = { error: string; issues?: unknown[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NetworkingResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }

  const untrustedToken =
    req.body &&
    typeof req.body === 'object' &&
    typeof (req.body as { token?: unknown }).token === 'string'
      ? (req.body as { token: string }).token
      : '';
  const tokenClaims =
    untrustedToken.length <= 256
      ? await verifyOrderTokenClaimsForCurrentTicket(untrustedToken)
      : null;
  if (!tokenClaims) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  if (tokenClaims.ticketId !== id.toLowerCase()) {
    res.status(403).json({ error: 'You do not have permission to update this ticket' });
    return;
  }

  const result = attendeeNetworkingUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
    return;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: networking, error: updateError } = await supabase
      .rpc('update_attendee_networking_profile', {
        p_ticket_id: tokenClaims.ticketId,
        p_manage_token_nonce: tokenClaims.manageTokenNonce,
        p_enabled: result.data.enabled,
        p_profile: result.data.profile,
      })
      .single();

    if (updateError || !networking) {
      log.error('Failed to save attendee networking profile', updateError, {
        ticketId: tokenClaims.ticketId,
      });
      res.status(500).json({ error: 'Failed to save networking profile' });
      return;
    }

    if (networking.result === 'invalid_token') {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    if (networking.result === 'not_found') {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (networking.result === 'ticket_not_confirmed') {
      res.status(409).json({ error: 'Networking is only available for confirmed tickets' });
      return;
    }

    if (networking.result !== 'ok' || !networking.share_id || networking.enabled === null) {
      log.error('Unexpected attendee networking update result', undefined, {
        ticketId: tokenClaims.ticketId,
        result: networking.result,
      });
      res.status(500).json({ error: 'Failed to save networking profile' });
      return;
    }

    const profileResult = attendeeNetworkingProfileSchema.safeParse(networking.profile);
    if (!profileResult.success) {
      log.error('Saved attendee networking profile is invalid', profileResult.error, {
        ticketId: tokenClaims.ticketId,
      });
      res.status(500).json({ error: 'Failed to save networking profile' });
      return;
    }

    res.status(200).json({
      shareId: networking.share_id,
      enabled: networking.enabled,
      profile: profileResult.data,
    });
  } catch (error) {
    log.error('Failed to update attendee networking profile', error, {
      ticketId: tokenClaims.ticketId,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}
