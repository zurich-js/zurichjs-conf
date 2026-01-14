/**
 * Partnership Coupons API
 * GET /api/admin/partnerships/[id]/coupons - List coupons for a partnership
 * POST /api/admin/partnerships/[id]/coupons - Create a new coupon
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { listCoupons, createCoupon, deactivateCoupon, deleteCoupon } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipCouponsAPI');

const createCouponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(30),
  type: z.enum(['percentage', 'fixed_amount']),
  discount_percent: z.number().min(1).max(100).optional(),
  discount_amount: z.number().min(1).optional(),
  currency: z.enum(['EUR', 'CHF', 'GBP']).optional(),
  restricted_product_ids: z.array(z.string()).default([]),
  max_redemptions: z.number().min(1).optional(),
  expires_at: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.type === 'percentage') {
      return data.discount_percent !== undefined;
    }
    return data.discount_amount !== undefined && data.currency !== undefined;
  },
  {
    message: 'Percentage discount requires discount_percent, fixed amount requires discount_amount and currency',
  }
);

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
    return handleList(id, res);
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
 * GET - List coupons for a partnership
 */
async function handleList(partnershipId: string, res: NextApiResponse) {
  try {
    const coupons = await listCoupons(partnershipId);
    return res.status(200).json({ coupons });
  } catch (error) {
    log.error('Error listing coupons', error as Error, { partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list coupons',
    });
  }
}

/**
 * POST - Create a new coupon
 */
async function handleCreate(partnershipId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsed = createCouponSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    const coupon = await createCoupon({
      partnership_id: partnershipId,
      ...parsed.data,
    });

    log.info('Coupon created', { couponId: coupon.id, code: coupon.code, partnershipId });

    return res.status(201).json(coupon);
  } catch (error) {
    log.error('Error creating coupon', error as Error, { partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create coupon',
    });
  }
}

/**
 * DELETE - Deactivate or delete a coupon
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { couponId, permanent } = req.body;

    if (!couponId) {
      return res.status(400).json({ error: 'couponId is required' });
    }

    if (permanent) {
      await deleteCoupon(couponId);
      log.info('Coupon deleted', { couponId });
    } else {
      await deactivateCoupon(couponId);
      log.info('Coupon deactivated', { couponId });
    }

    return res.status(204).end();
  } catch (error) {
    log.error('Error deleting/deactivating coupon', error as Error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete coupon',
    });
  }
}
