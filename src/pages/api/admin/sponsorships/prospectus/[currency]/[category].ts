/**
 * Admin sponsorship prospectus currency/category API.
 * POST /api/admin/sponsorships/prospectus/[currency]/[category]
 * DELETE /api/admin/sponsorships/prospectus/[currency]/[category]
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  deleteProspectusAsset,
  isProspectusCategory,
  isProspectusCurrency,
  uploadProspectusAsset,
} from '@/lib/sponsorship/prospectus';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Sponsorship Prospectus Category API');
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { currency, category } = req.query;
  const normalizedCurrency = typeof currency === 'string' ? currency.toUpperCase() : currency;
  if (!isProspectusCurrency(normalizedCurrency)) {
    return res.status(400).json({ error: 'Invalid prospectus currency' });
  }
  if (!isProspectusCategory(category)) {
    return res.status(400).json({ error: 'Invalid prospectus category' });
  }

  if (req.method === 'POST') {
    return handleUpload(normalizedCurrency, category, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(normalizedCurrency, category, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleUpload(
  currency: 'CHF' | 'EUR' | 'GBP' | 'USD',
  category: 'compact' | 'full',
  req: NextApiRequest,
  res: NextApiResponse,
) {
  let uploadedPath: string | null = null;

  try {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    const [, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    uploadedPath = uploadedFile.filepath;

    if (uploadedFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    const fileBuffer = await fs.readFile(uploadedFile.filepath);
    const asset = await uploadProspectusAsset(currency, category, fileBuffer);
    log.info('Prospectus uploaded', { currency, category, path: asset.path });
    return res.status(200).json({ asset });
  } catch (error) {
    log.error('Failed to upload prospectus', error, { currency, category });
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to upload prospectus' });
  } finally {
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch(() => {});
    }
  }
}

async function handleDelete(
  currency: 'CHF' | 'EUR' | 'GBP' | 'USD',
  category: 'compact' | 'full',
  res: NextApiResponse,
) {
  try {
    await deleteProspectusAsset(currency, category);
    log.info('Prospectus deleted', { currency, category });
    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Failed to delete prospectus', error, { currency, category });
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete prospectus' });
  }
}
