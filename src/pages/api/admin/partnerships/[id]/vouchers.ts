/**
 * Partnership Vouchers API
 * GET /api/admin/partnerships/[id]/vouchers - List vouchers for a partnership
 * POST /api/admin/partnerships/[id]/vouchers - Create new vouchers
 * DELETE /api/admin/partnerships/[id]/vouchers - Delete a voucher
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { listVouchers, createVouchers, deleteVoucher, getVoucherStats } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipVouchersAPI');

const createVouchersSchema = z.object({
  code: z.string().min(3).max(30).optional(),
  purpose: z.enum(['community_discount', 'raffle', 'giveaway', 'organizer_discount']),
  amount: z.number().min(100, 'Amount must be at least 1 (in cents)'),
  currency: z.enum(['EUR', 'CHF']),
  recipient_name: z.string().optional(),
  recipient_email: z.string().email().optional(),
  quantity: z.number().min(1).max(100).default(1),
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
    return handleList(id, req, res);
  }

  if (req.method === 'POST') {
    return handleCreate(id, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - List vouchers for a partnership
 */
async function handleList(partnershipId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const includeStats = req.query.stats === 'true';

    const vouchers = await listVouchers(partnershipId);

    if (includeStats) {
      const stats = await getVoucherStats(partnershipId);
      return res.status(200).json({ vouchers, stats });
    }

    return res.status(200).json({ vouchers });
  } catch (error) {
    log.error('Error listing vouchers', error as Error, { partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list vouchers',
    });
  }
}

/**
 * POST - Create new vouchers
 */
async function handleCreate(partnershipId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsed = createVouchersSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    const vouchers = await createVouchers({
      partnership_id: partnershipId,
      ...parsed.data,
    });

    log.info('Vouchers created', {
      count: vouchers.length,
      purpose: parsed.data.purpose,
      partnershipId,
    });

    return res.status(201).json({ vouchers });
  } catch (error) {
    log.error('Error creating vouchers', error as Error, { partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create vouchers',
    });
  }
}

/**
 * DELETE - Delete a voucher
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { voucherId } = req.body;

    if (!voucherId) {
      return res.status(400).json({ error: 'voucherId is required' });
    }

    await deleteVoucher(voucherId);

    log.info('Voucher deleted', { voucherId });

    return res.status(204).end();
  } catch (error) {
    log.error('Error deleting voucher', error as Error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete voucher',
    });
  }
}
