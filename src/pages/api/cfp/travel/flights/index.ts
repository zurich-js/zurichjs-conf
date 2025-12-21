/**
 * Speaker Flights API
 * GET /api/cfp/travel/flights - Get all flights
 * POST /api/cfp/travel/flights - Create a flight
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSpeakerFlights, createFlight } from '@/lib/cfp/travel';
import { flightSchema } from '@/lib/validations/cfp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  if (req.method === 'GET') {
    try {
      const flights = await getSpeakerFlights(speaker.id);
      return res.status(200).json({ flights });
    } catch (error) {
      console.error('[CFP Flights API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      // Validate request body with Zod
      const result = flightSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: result.error.issues,
        });
      }

      const { flight, error } = await createFlight(speaker.id, result.data);

      if (error) {
        return res.status(400).json({ error });
      }

      return res.status(201).json({ flight });
    } catch (error) {
      console.error('[CFP Flights API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
