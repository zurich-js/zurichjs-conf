/**
 * CFP Admin Speakers API
 * GET /api/admin/cfp/speakers - List all speakers
 * POST /api/admin/cfp/speakers - Create a new speaker manually
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import { createSpeaker } from '@/lib/cfp/speakers';
import { verifyAdminToken } from '@/lib/admin/auth';
import { adminCreateSpeakerSchema } from '@/lib/validations/cfp';
import { apiUnauthorized, apiValidationError, apiServerError, apiMethodNotAllowed } from '@/lib/api/responses';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const log = logger.scope('AdminSpeakersAPI');

  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return apiUnauthorized(res);
  }

  if (req.method === 'GET') {
    try {
      // Use optimized function that fetches speakers with submissions in parallel
      const speakers = await getAdminSpeakersWithSubmissions();
      log.debug('Fetched speakers with submissions', { count: speakers.length });
      return res.status(200).json({ speakers });
    } catch (error) {
      log.error('Failed to fetch speakers', error, { type: 'system' });
      return apiServerError(res);
    }
  }

  if (req.method === 'POST') {
    try {
      // Validate request body with Zod
      const result = adminCreateSpeakerSchema.safeParse(req.body);
      if (!result.success) {
        log.debug('Validation failed', { issues: result.error.issues });
        return apiValidationError(res, result.error);
      }

      const { speaker, error } = await createSpeaker(result.data);

      if (error) {
        log.warn('Failed to create speaker', { error });
        return res.status(400).json({ error });
      }

      log.info('Speaker created', { speakerId: speaker?.id, email: result.data.email });
      return res.status(201).json({ speaker });
    } catch (error) {
      log.error('Failed to create speaker', error, { type: 'system' });
      return apiServerError(res);
    }
  }

  return apiMethodNotAllowed(res);
}
