/**
 * Mark B2B Invoice as Paid API
 * POST /api/admin/b2b-invoices/[id]/mark-paid
 *
 * This endpoint marks an invoice as paid and creates tickets for all attendees.
 * It requires explicit confirmation to prevent accidental bulk operations.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { markInvoiceAsPaidAndCreateTickets, getPaymentSummary } from '@/lib/b2b';
import type { MarkPaidRequest } from '@/lib/types/b2b';
import { logger } from '@/lib/logger';

const log = logger.scope('B2B Invoice Mark Paid');

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

  // GET - Get payment summary (pre-flight check)
  if (req.method === 'GET') {
    return handleGetSummary(id, res);
  }

  // POST - Mark as paid and create tickets
  if (req.method === 'POST') {
    return handleMarkPaid(id, req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - Get payment summary before marking as paid
 * Useful for showing confirmation dialog
 */
async function handleGetSummary(invoiceId: string, res: NextApiResponse) {
  try {
    const summary = await getPaymentSummary(invoiceId);
    return res.status(200).json(summary);
  } catch (error) {
    log.error('Error getting payment summary', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get payment summary',
    });
  }
}

/**
 * POST - Mark invoice as paid and create tickets
 */
async function handleMarkPaid(
  invoiceId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = req.body as MarkPaidRequest;

    // Validate required fields
    if (!data.bankTransferReference) {
      return res.status(400).json({
        error: 'Missing required field: bankTransferReference',
      });
    }

    if (data.confirmTicketCreation !== true) {
      return res.status(400).json({
        error: 'Ticket creation must be explicitly confirmed by setting confirmTicketCreation to true',
      });
    }

    // Mark as paid and create tickets
    const result = await markInvoiceAsPaidAndCreateTickets(invoiceId, {
      bankTransferReference: data.bankTransferReference,
      sendConfirmationEmails: data.sendConfirmationEmails ?? false,
      confirmTicketCreation: true,
    });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Error marking invoice as paid', error);
    const message = error instanceof Error ? error.message : 'Failed to mark invoice as paid';

    // Return 400 for validation errors
    if (
      message.includes('Cannot') ||
      message.includes('not found') ||
      message.includes('Missing') ||
      message.includes('Expected')
    ) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}
