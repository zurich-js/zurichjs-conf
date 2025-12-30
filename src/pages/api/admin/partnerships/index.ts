/**
 * Partnerships API
 * GET /api/admin/partnerships - List partnerships with filtering
 * POST /api/admin/partnerships - Create a new partnership
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { listPartnerships, createPartnership } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipsAPI');

const createPartnershipSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['community', 'individual', 'company', 'sponsor']),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_email: z.string().email('Valid email is required'),
  contact_phone: z.string().optional(),
  company_name: z.string().optional(),
  company_website: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

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
 * GET - List partnerships with optional filtering
 */
async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, status, search, page, limit } = req.query;

    const result = await listPartnerships({
      type: type as 'community' | 'individual' | 'company' | 'sponsor' | undefined,
      status: status as 'active' | 'inactive' | 'pending' | 'expired' | undefined,
      search: typeof search === 'string' ? search : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Error listing partnerships', error as Error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list partnerships',
    });
  }
}

/**
 * POST - Create a new partnership
 */
async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsed = createPartnershipSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    const partnership = await createPartnership({
      ...parsed.data,
      company_website: parsed.data.company_website || undefined,
    });

    log.info('Partnership created', { partnershipId: partnership.id, name: partnership.name });

    return res.status(201).json(partnership);
  } catch (error) {
    log.error('Error creating partnership', error as Error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create partnership',
    });
  }
}
