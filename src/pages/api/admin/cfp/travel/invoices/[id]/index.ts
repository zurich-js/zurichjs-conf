/**
 * Admin Invoice CRUD API
 * PUT /api/admin/cfp/travel/invoices/[id] - Update invoice
 * DELETE /api/admin/cfp/travel/invoices/[id] - Delete invoice
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { updateInvoiceAdmin, deleteInvoiceAdmin } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Invoice CRUD API');

const updateSchema = z.object({
  expense_type: z.enum(['flight', 'accommodation', 'transport', 'other']).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  admin_notes: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'paid']).optional(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invoice ID is required' });
  }

  if (req.method === 'PUT') {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const { invoice, error } = await updateInvoiceAdmin(id, parsed.data);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Invoice updated', { invoiceId: id });
      return res.status(200).json({ invoice });
    } catch (error) {
      log.error('Error updating invoice', error, { invoiceId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { success, error } = await deleteInvoiceAdmin(id);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Invoice deleted', { invoiceId: id });
      return res.status(200).json({ success });
    } catch (error) {
      log.error('Error deleting invoice', error, { invoiceId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
