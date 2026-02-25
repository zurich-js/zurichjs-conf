/**
 * Stripe Products API
 * GET /api/admin/partnerships/products - Get available Stripe products for coupon restrictions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getStripeProducts } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipProductsAPI');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const products = await getStripeProducts();
    return res.status(200).json({ products });
  } catch (error) {
    log.error('Error fetching Stripe products', error as Error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch products',
    });
  }
}
