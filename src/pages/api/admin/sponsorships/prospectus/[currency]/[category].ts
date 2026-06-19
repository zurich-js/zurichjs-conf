/**
 * Admin sponsorship prospectus currency/category API.
 * POST /api/admin/sponsorships/prospectus/[currency]/[category] - Create signed upload token
 * DELETE /api/admin/sponsorships/prospectus/[currency]/[category]
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  createProspectusUploadToken,
  deleteProspectusAsset,
  isProspectusCategory,
  isProspectusCurrency,
} from '@/lib/sponsorship/prospectus';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Sponsorship Prospectus Category API');
const MAX_FILE_SIZE = 20 * 1024 * 1024;

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
    return handleCreateUploadToken(normalizedCurrency, category, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(normalizedCurrency, category, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCreateUploadToken(
  currency: 'CHF' | 'EUR' | 'GBP' | 'USD',
  category: 'compact' | 'full',
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { contentType, size } = req.body as {
      contentType?: string;
      size?: number;
    };
    const fileSize = typeof size === 'number' ? size : Number.NaN;

    if (contentType !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return res.status(400).json({ error: 'File size is required' });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'PDF must be 20 MB or smaller' });
    }

    const upload = await createProspectusUploadToken(currency, category);
    log.info('Prospectus upload token created', { currency, category, path: upload.path });
    return res.status(200).json(upload);
  } catch (error) {
    log.error('Failed to create prospectus upload token', error, { currency, category });
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create prospectus upload URL' });
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
