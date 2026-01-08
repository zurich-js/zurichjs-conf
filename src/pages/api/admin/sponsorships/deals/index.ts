/**
 * Sponsorship Deals API
 * GET /api/admin/sponsorships/deals - List deals with filtering
 * POST /api/admin/sponsorships/deals - Create a new deal
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createDeal, listDeals, getSponsor, getTier } from '@/lib/sponsorship';
import { initializeTierBaseLineItem } from '@/lib/sponsorship/line-items';
import { initializePerksForDeal } from '@/lib/sponsorship/perks';
import type { CreateDealRequest, SponsorshipDealStatus, SponsorshipCurrency } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Sponsorship Deals API');

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
 * GET - List deals with optional filtering
 */
async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, tierId, currency, sponsorId, search, page, limit } = req.query;

    const result = await listDeals({
      status: status as SponsorshipDealStatus | undefined,
      tierId: typeof tierId === 'string' ? tierId : undefined,
      currency: currency as SponsorshipCurrency | undefined,
      sponsorId: typeof sponsorId === 'string' ? sponsorId : undefined,
      search: typeof search === 'string' ? search : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Error listing deals', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list deals',
    });
  }
}

/**
 * POST - Create a new deal
 */
async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = req.body as CreateDealRequest;

    // Validate required fields
    if (!data.sponsorId) {
      return res.status(400).json({ error: 'Missing required field: sponsorId' });
    }
    if (!data.tierId) {
      return res.status(400).json({ error: 'Missing required field: tierId' });
    }
    if (!data.currency || !['CHF', 'EUR'].includes(data.currency)) {
      return res.status(400).json({ error: 'Invalid or missing currency (must be CHF or EUR)' });
    }

    // Verify sponsor exists
    const sponsor = await getSponsor(data.sponsorId);
    if (!sponsor) {
      return res.status(400).json({ error: 'Sponsor not found' });
    }

    // Verify tier exists
    const tier = await getTier(data.tierId);
    if (!tier) {
      return res.status(400).json({ error: 'Tier not found' });
    }

    // Create deal
    const deal = await createDeal(data);
    log.info('Deal created', { dealId: deal.id, dealNumber: deal.deal_number });

    // Initialize tier base line item
    await initializeTierBaseLineItem(deal.id, data.tierId, data.currency);

    // Initialize perks based on tier
    await initializePerksForDeal(deal.id, data.tierId);

    return res.status(201).json(deal);
  } catch (error) {
    log.error('Error creating deal', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create deal',
    });
  }
}
