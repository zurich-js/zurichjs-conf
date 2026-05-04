/**
 * Admin Travel Invoices API
 * GET /api/admin/cfp/travel/invoices - List all invoices with speaker info
 * POST /api/admin/cfp/travel/invoices - Create invoice for a speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getAllInvoices, createInvoiceAdmin } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Invoices API');

const createSchema = z.object({
  speaker_id: z.string().uuid(),
  expense_type: z.enum(['flight', 'accommodation', 'transport', 'other']),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().optional(),
  admin_notes: z.string().optional(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const status = req.query.status as string | undefined;
      const invoices = await getAllInvoices(
        status ? { status: status as 'pending' | 'approved' | 'rejected' | 'paid' } : undefined
      );
      return res.status(200).json({ invoices });
    } catch (error) {
      log.error('Error fetching invoices', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const { speaker_id, ...data } = parsed.data;
      const { invoice, error } = await createInvoiceAdmin(speaker_id, data);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Invoice created', { speakerId: speaker_id });
      return res.status(201).json({ invoice });
    } catch (error) {
      log.error('Error creating invoice', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
