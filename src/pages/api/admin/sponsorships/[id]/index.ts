/**
 * Single Sponsor API
 * GET /api/admin/sponsorships/[id] - Get sponsor details
 * PUT /api/admin/sponsorships/[id] - Update sponsor
 * DELETE /api/admin/sponsorships/[id] - Delete sponsor
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getSponsor, updateSponsor, deleteSponsor } from '@/lib/sponsorship';
import type { UpdateSponsorRequest } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Sponsor API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing sponsor ID' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(id, res);
    case 'PUT':
      return handleUpdate(id, req, res);
    case 'DELETE':
      return handleDelete(id, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Get sponsor details
 */
async function handleGet(id: string, res: NextApiResponse) {
  try {
    const sponsor = await getSponsor(id);

    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    return res.status(200).json(sponsor);
  } catch (error) {
    log.error('Error fetching sponsor', { error, sponsorId: id });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch sponsor',
    });
  }
}

/**
 * PUT - Update sponsor
 */
async function handleUpdate(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = req.body as UpdateSponsorRequest;

    // Validate email if provided
    if (data.contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contactEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    const sponsor = await updateSponsor(id, data);
    log.info('Sponsor updated', { sponsorId: id });

    return res.status(200).json(sponsor);
  } catch (error) {
    log.error('Error updating sponsor', { error, sponsorId: id });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update sponsor',
    });
  }
}

/**
 * DELETE - Delete sponsor
 */
async function handleDelete(id: string, res: NextApiResponse) {
  try {
    await deleteSponsor(id);
    log.info('Sponsor deleted', { sponsorId: id });

    return res.status(204).end();
  } catch (error) {
    log.error('Error deleting sponsor', { error, sponsorId: id });

    // Check for specific errors
    if (error instanceof Error && error.message.includes('existing deals')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete sponsor',
    });
  }
}
