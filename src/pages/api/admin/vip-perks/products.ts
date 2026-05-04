/**
 * VIP Perks Products API
 * GET /api/admin/vip-perks/products — Get active Stripe products for coupon restrictions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getStripeProducts } from '@/lib/partnerships/coupons';
import { logger } from '@/lib/logger';

const log = logger.scope('VipPerksProductsAPI');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const products = await getStripeProducts();
    return res.status(200).json(products);
  } catch (error) {
    log.error('Failed to fetch products for VIP perks', error as Error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
