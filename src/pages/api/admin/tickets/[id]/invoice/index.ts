/**
 * Ticket Invoice API
 * GET  /api/admin/tickets/[id]/invoice - Resolve order context and return existing invoice
 * POST /api/admin/tickets/[id]/invoice - Create invoice record (idempotent)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { resolveOrderContext, createTicketInvoice, deleteTicketInvoice } from '@/lib/tickets';
import { logger } from '@/lib/logger';

const log = logger.scope('Ticket Invoice API');

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const orderContext = await resolveOrderContext(id);
    return res.status(200).json({ orderContext });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.toLowerCase().includes('not found')) {
      return res.status(404).json({ error: message });
    }
    log.error('Error resolving order context', error, { ticketId: id });
    return res.status(500).json({ error: 'Failed to resolve order context' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const orderContext = await resolveOrderContext(id);

    if (!orderContext.canGenerateInvoice) {
      return res.status(422).json({ error: orderContext.invoiceWarning });
    }

    const wasPreExisting = orderContext.existingInvoice !== null;
    const invoice = await createTicketInvoice(orderContext);
    return res.status(wasPreExisting ? 200 : 201).json({ invoice, created: !wasPreExisting });
  } catch (error) {
    log.error('Error creating ticket invoice', error, { ticketId: id });
    return res.status(500).json({ error: 'Failed to create ticket invoice' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const orderContext = await resolveOrderContext(id);
    if (!orderContext.existingInvoice) {
      return res.status(404).json({ error: 'No invoice found for this ticket' });
    }
    await deleteTicketInvoice(orderContext.existingInvoice.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.toLowerCase().includes('not found')) {
      return res.status(404).json({ error: message });
    }
    log.error('Error deleting ticket invoice', error, { ticketId: id });
    return res.status(500).json({ error: 'Failed to delete ticket invoice' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);

  return res.status(405).json({ error: 'Method not allowed' });
}
