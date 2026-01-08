/**
 * Upload Sponsorship Invoice PDF API
 * POST /api/admin/sponsorships/deals/[dealId]/invoice/pdf/upload
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getDealWithRelations, updateInvoicePDF } from '@/lib/sponsorship';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Upload Sponsorship Invoice PDF API');

// Disable Next.js default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dealId } = req.query;
  if (!dealId || typeof dealId !== 'string') {
    return res.status(400).json({ error: 'Missing deal ID' });
  }

  try {
    // Get deal with invoice
    const deal = await getDealWithRelations(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if invoice exists
    if (!deal.invoice) {
      return res.status(400).json({ error: 'No invoice exists for this deal. Create an invoice first.' });
    }

    // Parse form with formidable
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    const [, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate MIME type
    if (uploadedFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Read file
    const fileBuffer = await fs.readFile(uploadedFile.filepath);

    // Upload to storage
    const supabase = createServiceRoleClient();
    const filename = `${deal.invoice.invoice_number}-uploaded.pdf`;
    const filePath = `invoices/${filename}`;

    // Delete old PDF files for this invoice
    const { data: existingFiles } = await supabase.storage
      .from('sponsorship-assets')
      .list('invoices', { search: deal.invoice.invoice_number });

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `invoices/${f.name}`);
      try {
        await supabase.storage.from('sponsorship-assets').remove(filesToDelete);
      } catch (cleanupError) {
        log.warn('Failed to cleanup old PDF files', { error: cleanupError });
      }
    }

    // Upload new PDF
    const { error: uploadError } = await supabase.storage
      .from('sponsorship-assets')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('sponsorship-assets')
      .getPublicUrl(filePath);

    // Update invoice record
    await updateInvoicePDF(deal.invoice.id, publicUrl, 'uploaded');

    // Clean up temp file
    await fs.unlink(uploadedFile.filepath).catch(() => {});

    log.info('Sponsorship invoice PDF uploaded', {
      dealId,
      invoiceNumber: deal.invoice.invoice_number,
      pdfUrl: publicUrl,
    });

    return res.status(200).json({
      success: true,
      pdfUrl: publicUrl,
      source: 'uploaded',
    });
  } catch (error) {
    log.error('Error uploading sponsorship invoice PDF', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload PDF',
    });
  }
}
