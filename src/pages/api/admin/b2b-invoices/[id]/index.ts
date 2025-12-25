/**
 * Single B2B Invoice API
 * GET /api/admin/b2b-invoices/[id] - Get invoice details
 * PUT /api/admin/b2b-invoices/[id] - Update invoice
 * DELETE /api/admin/b2b-invoices/[id] - Delete invoice (draft only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import {
  getInvoiceWithAttendees,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from '@/lib/b2b';
import type { UpdateB2BInvoiceRequest, B2BInvoiceStatus } from '@/lib/types/b2b';
import { logger } from '@/lib/logger';

const log = logger.scope('B2B Invoice API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  if (req.method === 'GET') {
    return handleGet(id, res);
  }

  if (req.method === 'PUT') {
    return handleUpdate(id, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(id, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - Get invoice with attendees
 */
async function handleGet(invoiceId: string, res: NextApiResponse) {
  try {
    const invoice = await getInvoiceWithAttendees(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.status(200).json(invoice);
  } catch (error) {
    log.error('Error fetching invoice', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    });
  }
}

/**
 * PUT - Update invoice details or status
 */
async function handleUpdate(
  invoiceId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { status, ...data } = req.body;

    // If only status is being updated, use status update function
    if (status && Object.keys(data).length === 0) {
      const validStatuses: B2BInvoiceStatus[] = ['draft', 'sent', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status: ${status}` });
      }

      const updated = await updateInvoiceStatus(invoiceId, status);
      return res.status(200).json(updated);
    }

    // Otherwise, update invoice fields
    const updateData: UpdateB2BInvoiceRequest = data;
    const updated = await updateInvoice(invoiceId, updateData);

    return res.status(200).json(updated);
  } catch (error) {
    log.error('Error updating invoice', error);
    const message = error instanceof Error ? error.message : 'Failed to update invoice';

    // Return 400 for validation errors
    if (message.includes('Cannot') || message.includes('Invalid')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE - Delete invoice (draft status only)
 */
async function handleDelete(invoiceId: string, res: NextApiResponse) {
  try {
    await deleteInvoice(invoiceId);
    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error deleting invoice', error);
    const message = error instanceof Error ? error.message : 'Failed to delete invoice';

    if (message.includes('Cannot') || message.includes('not found')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}
