/**
 * Admin Invoice PDF Upload API
 * POST /api/admin/cfp/travel/invoices/[id]/upload - Upload invoice PDF
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { updateInvoicePdfUrl } from '@/lib/cfp/admin-travel';
import { createServiceRoleClient } from '@/lib/supabase';
import formidable from 'formidable';
import fs from 'fs';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Invoice PDF Upload');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  try {
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

    const fileBuffer = await fs.promises.readFile(uploadedFile.filepath);

    const supabase = createServiceRoleClient();
    const filename = `invoice-${id}-${Date.now()}.pdf`;
    const filePath = `travel-invoices/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('travel-invoices')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      log.error('Error uploading PDF', uploadError);
      return res.status(500).json({ error: 'Failed to upload PDF to storage' });
    }

    const { data: urlData } = supabase.storage
      .from('travel-invoices')
      .getPublicUrl(filePath);

    await updateInvoicePdfUrl(id, urlData.publicUrl);

    await fs.promises.unlink(uploadedFile.filepath).catch(() => {});

    return res.status(200).json({
      success: true,
      pdfUrl: urlData.publicUrl,
    });
  } catch (error) {
    log.error('Error uploading invoice PDF', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload PDF',
    });
  }
}
