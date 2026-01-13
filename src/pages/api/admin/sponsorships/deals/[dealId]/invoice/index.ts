/**
 * Deal Invoice API
 * GET /api/admin/sponsorships/deals/[dealId]/invoice - Get invoice for deal
 * POST /api/admin/sponsorships/deals/[dealId]/invoice - Create invoice for deal
 * PUT /api/admin/sponsorships/deals/[dealId]/invoice - Update invoice (due date, notes)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getDeal, getInvoiceForDeal, createInvoice, getTier } from '@/lib/sponsorship';
import { updateInvoice } from '@/lib/sponsorship/invoices';
import { getLineItemsForDeal } from '@/lib/sponsorship/line-items';
import { computeSponsorshipInvoiceTotals } from '@/lib/sponsorship/calculations';
import type { CreateInvoiceRequest, SponsorshipCurrency } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Deal Invoice API');

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
      return handleGet(dealId, res);
    case 'POST':
      return handleCreate(dealId, req, res);
    case 'PUT':
      return handleUpdate(dealId, req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Get invoice for deal (with calculated preview if no invoice exists)
 */
async function handleGet(dealId: string, res: NextApiResponse) {
  try {
    const invoice = await getInvoiceForDeal(dealId);

    if (invoice) {
      return res.status(200).json(invoice);
    }

    // If no invoice exists, return a preview calculation
    const deal = await getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const tier = await getTier(deal.tier_id);
    if (!tier) {
      return res.status(500).json({ error: 'Tier not found' });
    }

    const lineItems = await getLineItemsForDeal(dealId);
    const totals = computeSponsorshipInvoiceTotals(
      lineItems,
      tier,
      deal.currency as SponsorshipCurrency
    );

    return res.status(200).json({
      preview: true,
      ...totals,
      currency: deal.currency,
    });
  } catch (error) {
    log.error('Error fetching invoice', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    });
  }
}

/**
 * POST - Create invoice for deal
 */
async function handleCreate(
  dealId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = req.body as CreateInvoiceRequest;

    // Validate required fields
    if (!data.dueDate) {
      return res.status(400).json({ error: 'Missing required field: dueDate' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.dueDate)) {
      return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    // Check deal status - invoice can only be created from offer_sent status
    const deal = await getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (deal.status !== 'offer_sent') {
      return res.status(400).json({
        error: `Cannot create invoice for deal in '${deal.status}' status. Deal must be in 'offer_sent' status.`,
      });
    }

    const invoice = await createInvoice(dealId, data);
    log.info('Invoice created', { dealId, invoiceNumber: invoice.invoice_number });

    return res.status(201).json(invoice);
  } catch (error) {
    log.error('Error creating invoice', { error, dealId });

    // Check for specific errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    });
  }
}

/**
 * PUT - Update invoice (due date, notes)
 */
async function handleUpdate(
  dealId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { dueDate, invoiceNotes } = req.body as { dueDate?: string; invoiceNotes?: string };

    // Get existing invoice
    const invoice = await getInvoiceForDeal(dealId);
    if (!invoice) {
      return res.status(404).json({ error: 'No invoice exists for this deal' });
    }

    // Validate date format if provided
    if (dueDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dueDate)) {
        return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' });
      }
    }

    const updatedInvoice = await updateInvoice(invoice.id, { dueDate, invoiceNotes });
    log.info('Invoice updated', { dealId, invoiceId: invoice.id });

    return res.status(200).json(updatedInvoice);
  } catch (error) {
    log.error('Error updating invoice', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update invoice',
    });
  }
}
