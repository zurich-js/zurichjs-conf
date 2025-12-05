/**
 * B2B Invoices API
 * GET /api/admin/b2b-invoices - List invoices with filtering
 * POST /api/admin/b2b-invoices - Create a new invoice
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import {
  createInvoice,
  listInvoices,
} from '@/lib/b2b';
import type { CreateB2BInvoiceRequest, B2BInvoiceStatus } from '@/lib/types/b2b';

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
 * GET - List invoices with optional filtering
 */
async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, search, page, limit } = req.query;

    const result = await listInvoices({
      status: status as B2BInvoiceStatus | undefined,
      search: typeof search === 'string' ? search : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error listing invoices:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list invoices',
    });
  }
}

/**
 * POST - Create a new invoice
 */
async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = req.body as CreateB2BInvoiceRequest;

    // Validate required fields
    const requiredFields = [
      'companyName',
      'contactName',
      'contactEmail',
      'dueDate',
      'ticketCategory',
      'ticketStage',
      'ticketQuantity',
      'unitPrice',
    ] as const;

    for (const field of requiredFields) {
      if (!data[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Validate billing address
    if (!data.billingAddress) {
      return res.status(400).json({ error: 'Missing required field: billingAddress' });
    }
    const addressFields = ['street', 'city', 'postalCode', 'country'] as const;
    for (const field of addressFields) {
      if (!data.billingAddress[field]) {
        return res.status(400).json({ error: `Missing required field: billingAddress.${field}` });
      }
    }

    // Validate numeric fields
    if (data.ticketQuantity < 1) {
      return res.status(400).json({ error: 'ticketQuantity must be at least 1' });
    }
    if (data.unitPrice < 0) {
      return res.status(400).json({ error: 'unitPrice cannot be negative' });
    }

    const invoice = await createInvoice(data);

    return res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    });
  }
}
