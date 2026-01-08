/**
 * Deal Perks API
 * GET /api/admin/sponsorships/deals/[dealId]/perks - List perks
 * POST /api/admin/sponsorships/deals/[dealId]/perks - Add perk
 * PUT /api/admin/sponsorships/deals/[dealId]/perks - Update perk
 * DELETE /api/admin/sponsorships/deals/[dealId]/perks - Remove perk
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getDeal } from '@/lib/sponsorship';
import {
  getPerksForDeal,
  addPerk,
  updatePerk,
  removePerk,
} from '@/lib/sponsorship/perks';
import type { UpdatePerkRequest, SponsorshipPerkStatus } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Perks API');

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

  // Verify deal exists
  const deal = await getDeal(dealId);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  switch (req.method) {
    case 'GET':
      return handleList(dealId, res);
    case 'POST':
      return handleAdd(dealId, req, res);
    case 'PUT':
      return handleUpdate(req, res);
    case 'DELETE':
      return handleRemove(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - List all perks for a deal
 */
async function handleList(dealId: string, res: NextApiResponse) {
  try {
    const perks = await getPerksForDeal(dealId);
    return res.status(200).json({ perks });
  } catch (error) {
    log.error('Error listing perks', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list perks',
    });
  }
}

/**
 * POST - Add a new perk
 */
async function handleAdd(
  dealId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { name, description } = req.body as { name: string; description?: string };

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const perk = await addPerk(dealId, name, description);
    log.info('Perk added', { dealId, perkId: perk.id });

    return res.status(201).json(perk);
  } catch (error) {
    log.error('Error adding perk', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to add perk',
    });
  }
}

/**
 * PUT - Update a perk
 */
async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { perkId, ...data } = req.body as UpdatePerkRequest & { perkId: string };

    if (!perkId) {
      return res.status(400).json({ error: 'Missing required field: perkId' });
    }

    // Validate status if provided
    if (data.status) {
      const validStatuses: SponsorshipPerkStatus[] = [
        'pending',
        'in_progress',
        'completed',
        'not_applicable',
      ];
      if (!validStatuses.includes(data.status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
    }

    const perk = await updatePerk(perkId, data);
    log.info('Perk updated', { perkId });

    return res.status(200).json(perk);
  } catch (error) {
    log.error('Error updating perk', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update perk',
    });
  }
}

/**
 * DELETE - Remove a perk
 */
async function handleRemove(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { perkId } = req.body as { perkId: string };

    if (!perkId) {
      return res.status(400).json({ error: 'Missing required field: perkId' });
    }

    await removePerk(perkId);
    log.info('Perk removed', { perkId });

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error removing perk', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remove perk',
    });
  }
}
