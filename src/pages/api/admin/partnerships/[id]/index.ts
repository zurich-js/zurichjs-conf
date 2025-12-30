/**
 * Partnership API
 * GET /api/admin/partnerships/[id] - Get a partnership
 * PUT /api/admin/partnerships/[id] - Update a partnership
 * DELETE /api/admin/partnerships/[id] - Delete a partnership
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import {
  getPartnershipWithDetails,
  updatePartnership,
  deletePartnership,
} from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipAPI');

const updatePartnershipSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['community', 'individual', 'company', 'sponsor']).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'expired']).optional(),
  contact_name: z.string().min(1).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  company_website: z.string().url().optional().nullable().or(z.literal('')),
  company_logo_url: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid partnership ID' });
  }

  if (req.method === 'GET') {
    return handleGet(id, res);
  }

  if (req.method === 'PUT') {
    return handleUpdate(id, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(id, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - Get a partnership with details
 */
async function handleGet(id: string, res: NextApiResponse) {
  try {
    const partnership = await getPartnershipWithDetails(id);

    if (!partnership) {
      return res.status(404).json({ error: 'Partnership not found' });
    }

    return res.status(200).json(partnership);
  } catch (error) {
    log.error('Error getting partnership', error as Error, { partnershipId: id });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get partnership',
    });
  }
}

/**
 * PUT - Update a partnership
 */
async function handleUpdate(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsed = updatePartnershipSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    // Convert empty strings and null to undefined
    const updateData = {
      ...parsed.data,
      contact_phone: parsed.data.contact_phone || undefined,
      company_name: parsed.data.company_name || undefined,
      company_website: parsed.data.company_website || undefined,
      company_logo_url: parsed.data.company_logo_url || undefined,
      notes: parsed.data.notes || undefined,
    };

    const partnership = await updatePartnership(id, updateData);

    log.info('Partnership updated', { partnershipId: id });

    return res.status(200).json(partnership);
  } catch (error) {
    log.error('Error updating partnership', error as Error, { partnershipId: id });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update partnership',
    });
  }
}

/**
 * DELETE - Delete a partnership
 */
async function handleDelete(id: string, res: NextApiResponse) {
  try {
    await deletePartnership(id);

    log.info('Partnership deleted', { partnershipId: id });

    return res.status(204).end();
  } catch (error) {
    log.error('Error deleting partnership', error as Error, { partnershipId: id });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete partnership',
    });
  }
}
