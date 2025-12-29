/**
 * B2B Invoice PDF Download API
 * GET /api/admin/b2b-invoices/[id]/pdf - Download attached PDF
 * DELETE /api/admin/b2b-invoices/[id]/pdf - Remove attached PDF
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getInvoice, removeInvoicePDF } from '@/lib/b2b';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('B2B Invoice PDF');

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
    return handleDownload(id, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(id, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - Download the attached PDF
 */
async function handleDownload(invoiceId: string, res: NextApiResponse) {
  try {
    const invoice = await getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.invoice_pdf_url) {
      return res.status(404).json({ error: 'No PDF attached to this invoice' });
    }

    // Fetch the PDF from storage
    const supabase = createServiceRoleClient();

    // Extract the file path from the URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/b2b-invoices/filename.pdf
    const urlParts = invoice.invoice_pdf_url.split('/b2b-invoices/');
    if (urlParts.length !== 2) {
      return res.status(500).json({ error: 'Invalid PDF URL format' });
    }

    const filePath = urlParts[1];
    const { data, error } = await supabase.storage
      .from('b2b-invoices')
      .download(filePath);

    if (error) {
      log.error('Error downloading PDF', error);
      return res.status(500).json({ error: 'Failed to download PDF' });
    }

    // Convert Blob to Buffer
    const buffer = Buffer.from(await data.arrayBuffer());

    // Set headers for PDF download
    const filename = `${invoice.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  } catch (error) {
    log.error('Error downloading PDF', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to download PDF',
    });
  }
}

/**
 * DELETE - Remove the attached PDF
 */
async function handleDelete(invoiceId: string, res: NextApiResponse) {
  try {
    const invoice = await getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.invoice_pdf_url) {
      return res.status(400).json({ error: 'No PDF attached to this invoice' });
    }

    // Delete from storage
    const supabase = createServiceRoleClient();
    const urlParts = invoice.invoice_pdf_url.split('/b2b-invoices/');
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      await supabase.storage.from('b2b-invoices').remove([filePath]);
    }

    // Update invoice record
    await removeInvoicePDF(invoiceId);

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error deleting PDF', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete PDF',
    });
  }
}
