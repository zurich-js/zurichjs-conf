/**
 * Deal Line Items API
 * GET /api/admin/sponsorships/deals/[dealId]/line-items - List line items
 * POST /api/admin/sponsorships/deals/[dealId]/line-items - Add line item
 * PUT /api/admin/sponsorships/deals/[dealId]/line-items - Update line item
 * DELETE /api/admin/sponsorships/deals/[dealId]/line-items - Remove line item
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getDeal } from '@/lib/sponsorship';
import {
  getLineItemsForDeal,
  addLineItem,
  updateLineItem,
  removeLineItem,
} from '@/lib/sponsorship/line-items';
import type { AddLineItemRequest, UpdateLineItemRequest } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Line Items API');

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
 * GET - List all line items for a deal
 */
async function handleList(dealId: string, res: NextApiResponse) {
  try {
    const lineItems = await getLineItemsForDeal(dealId);
    return res.status(200).json({ lineItems });
  } catch (error) {
    log.error('Error listing line items', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list line items',
    });
  }
}

/**
 * POST - Add a new line item
 */
async function handleAdd(
  dealId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = req.body as AddLineItemRequest;

    // Validate required fields
    if (!data.type || !['addon', 'adjustment'].includes(data.type)) {
      return res.status(400).json({ error: 'Invalid type (must be addon or adjustment)' });
    }
    if (!data.description) {
      return res.status(400).json({ error: 'Missing required field: description' });
    }
    if (data.unitPrice === undefined || data.unitPrice === null) {
      return res.status(400).json({ error: 'Missing required field: unitPrice' });
    }

    // For adjustments, allow negative values
    // For add-ons, unitPrice must be positive
    if (data.type === 'addon' && data.unitPrice < 0) {
      return res.status(400).json({ error: 'Add-on unit price cannot be negative' });
    }

    const lineItem = await addLineItem(dealId, data);
    log.info('Line item added', { dealId, lineItemId: lineItem.id });

    return res.status(201).json(lineItem);
  } catch (error) {
    log.error('Error adding line item', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to add line item',
    });
  }
}

/**
 * PUT - Update a line item
 */
async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lineItemId, ...data } = req.body as UpdateLineItemRequest & { lineItemId: string };

    if (!lineItemId) {
      return res.status(400).json({ error: 'Missing required field: lineItemId' });
    }

    const lineItem = await updateLineItem(lineItemId, data);
    log.info('Line item updated', { lineItemId });

    return res.status(200).json(lineItem);
  } catch (error) {
    log.error('Error updating line item', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update line item',
    });
  }
}

/**
 * DELETE - Remove a line item
 */
async function handleRemove(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lineItemId } = req.body as { lineItemId: string };

    if (!lineItemId) {
      return res.status(400).json({ error: 'Missing required field: lineItemId' });
    }

    await removeLineItem(lineItemId);
    log.info('Line item removed', { lineItemId });

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error removing line item', error);

    // Check for specific errors
    if (error instanceof Error && error.message.includes('tier base')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remove line item',
    });
  }
}
