/**
 * Upload B2B Invoice PDF API
 * POST /api/admin/b2b-invoices/[id]/pdf/upload
 *
 * Accepts a PDF file upload and stores it in Supabase storage.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getInvoice, updateInvoicePDF } from '@/lib/b2b';
import { createServiceRoleClient } from '@/lib/supabase';
import formidable from 'formidable';
import fs from 'fs';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  try {
    // Get invoice to verify it exists
    const invoice = await getInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Parse the form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      filter: (part) => {
        return part.mimetype === 'application/pdf';
      },
    });

    const [, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Read the file
    const fileBuffer = await fs.promises.readFile(uploadedFile.filepath);

    // Upload to Supabase storage
    const supabase = createServiceRoleClient();
    const filename = `${invoice.invoice_number}-uploaded.pdf`;
    const filePath = `invoices/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('b2b-invoices')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return res.status(500).json({ error: 'Failed to upload PDF to storage' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('b2b-invoices')
      .getPublicUrl(filePath);

    // Update invoice with PDF URL
    await updateInvoicePDF(id, urlData.publicUrl, 'uploaded');

    // Clean up temp file
    await fs.promises.unlink(uploadedFile.filepath).catch(() => {});

    return res.status(200).json({
      success: true,
      pdfUrl: urlData.publicUrl,
      source: 'uploaded',
    });
  } catch (error) {
    console.error('Error uploading invoice PDF:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload PDF',
    });
  }
}
