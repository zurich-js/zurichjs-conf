/**
 * Sponsors API
 * GET /api/admin/sponsorships - List sponsors with filtering
 * POST /api/admin/sponsorships - Create a new sponsor
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createSponsor, listSponsors } from '@/lib/sponsorship';
import type { CreateSponsorRequest } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Sponsors API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    return handleList(req, res);
  }

  if (req.method === 'POST') {
    return handleCreate(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - List sponsors with optional filtering
 */
async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { search, hasPublicLogo, page, limit } = req.query;

    const result = await listSponsors({
      search: typeof search === 'string' ? search : undefined,
      hasPublicLogo: hasPublicLogo === 'true' ? true : hasPublicLogo === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Error listing sponsors', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list sponsors',
    });
  }
}

/**
 * POST - Create a new sponsor
 */
async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = req.body as CreateSponsorRequest;

    // Validate required fields
    const requiredFields = ['companyName', 'contactName', 'contactEmail'] as const;
    for (const field of requiredFields) {
      if (!data[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Validate billing address
    if (!data.billingAddress) {
      return res.status(400).json({ error: 'Missing required field: billingAddress' });
    }
    const addressFields = ['street', 'city', 'postalCode', 'country'] as const;
    for (const field of addressFields) {
      if (!data.billingAddress[field]) {
        return res.status(400).json({ error: `Missing required field: billingAddress.${field}` });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const sponsor = await createSponsor(data);
    log.info('Sponsor created', { sponsorId: sponsor.id, companyName: sponsor.company_name });

    return res.status(201).json(sponsor);
  } catch (error) {
    log.error('Error creating sponsor', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create sponsor',
    });
  }
}
