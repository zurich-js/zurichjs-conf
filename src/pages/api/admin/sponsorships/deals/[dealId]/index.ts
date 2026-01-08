/**
 * Single Deal API
 * GET /api/admin/sponsorships/deals/[dealId] - Get deal details with relations
 * PUT /api/admin/sponsorships/deals/[dealId] - Update deal
 * DELETE /api/admin/sponsorships/deals/[dealId] - Delete deal
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getDealWithRelations, updateDeal, deleteDeal, getTier } from '@/lib/sponsorship';
import { updateTierBaseLineItem } from '@/lib/sponsorship/line-items';
import type { UpdateDealRequest, SponsorshipCurrency } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Deal API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { dealId } = req.query;
  if (!dealId || typeof dealId !== 'string') {
    return res.status(400).json({ error: 'Missing deal ID' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(dealId, res);
    case 'PUT':
      return handleUpdate(dealId, req, res);
    case 'DELETE':
      return handleDelete(dealId, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Get deal details with all relations
 */
async function handleGet(dealId: string, res: NextApiResponse) {
  try {
    const deal = await getDealWithRelations(dealId);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    return res.status(200).json(deal);
  } catch (error) {
    log.error('Error fetching deal', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch deal',
    });
  }
}

/**
 * PUT - Update deal
 */
async function handleUpdate(
  dealId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = req.body as UpdateDealRequest;

    // Validate currency if provided
    if (data.currency && !['CHF', 'EUR'].includes(data.currency)) {
      return res.status(400).json({ error: 'Invalid currency (must be CHF or EUR)' });
    }

    // Validate tier if provided
    if (data.tierId) {
      const tier = await getTier(data.tierId);
      if (!tier) {
        return res.status(400).json({ error: 'Tier not found' });
      }
    }

    // Get current deal to check if tier or currency changed
    const currentDeal = await getDealWithRelations(dealId);
    if (!currentDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Update deal
    await updateDeal(dealId, data);
    log.info('Deal updated', { dealId });

    // If tier or currency changed, update the tier base line item
    const newTierId = data.tierId || currentDeal.tier_id;
    const newCurrency = (data.currency || currentDeal.currency) as SponsorshipCurrency;

    if (data.tierId || data.currency) {
      await updateTierBaseLineItem(dealId, newTierId, newCurrency);
    }

    // Return updated deal with relations
    const updatedDeal = await getDealWithRelations(dealId);
    return res.status(200).json(updatedDeal);
  } catch (error) {
    log.error('Error updating deal', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update deal',
    });
  }
}

/**
 * DELETE - Delete deal
 */
async function handleDelete(dealId: string, res: NextApiResponse) {
  try {
    await deleteDeal(dealId);
    log.info('Deal deleted', { dealId });

    return res.status(204).end();
  } catch (error) {
    log.error('Error deleting deal', { error, dealId });

    // Check for specific errors
    if (error instanceof Error && error.message.includes('draft status')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete deal',
    });
  }
}
