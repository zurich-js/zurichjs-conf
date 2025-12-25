/**
 * Speaker Flight API
 * PUT /api/cfp/travel/flights/[id] - Update a flight
 * DELETE /api/cfp/travel/flights/[id] - Delete a flight
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { updateFlight, deleteFlight } from '@/lib/cfp/travel';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Flight API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Flight ID is required' });
  }

  // Get session
  const supabase = createSupabaseApiClient(req, res);
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get speaker
  const speaker = await getSpeakerByUserId(session.user.id);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  if (req.method === 'PUT') {
    try {
      const {
        direction,
        airline,
        flight_number,
        departure_airport,
        arrival_airport,
        departure_time,
        arrival_time,
        booking_reference,
        cost_amount,
        cost_currency,
      } = req.body;

      const { flight, error } = await updateFlight(id, speaker.id, {
        direction,
        airline,
        flight_number,
        departure_airport,
        arrival_airport,
        departure_time,
        arrival_time,
        booking_reference,
        cost_amount,
        cost_currency,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Flight updated', { speakerId: speaker.id, flightId: id });
      return res.status(200).json({ flight });
    } catch (error) {
      log.error('Failed to update flight', error, { speakerId: speaker.id, flightId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { success, error } = await deleteFlight(id, speaker.id);

      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Flight deleted', { speakerId: speaker.id, flightId: id });
      return res.status(200).json({ success });
    } catch (error) {
      log.error('Failed to delete flight', error, { speakerId: speaker.id, flightId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
