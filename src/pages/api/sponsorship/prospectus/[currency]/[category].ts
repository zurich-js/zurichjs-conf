/**
 * Public sponsorship prospectus download API.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  downloadProspectusAsset,
  isProspectusCategory,
  isProspectusCurrency,
} from '@/lib/sponsorship/prospectus';
import { logger } from '@/lib/logger';

const log = logger.scope('Public Sponsorship Prospectus Download API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { currency, category } = req.query;
  const normalizedCurrency = typeof currency === 'string' ? currency.toUpperCase() : currency;
  if (!isProspectusCurrency(normalizedCurrency)) {
    return res.status(400).json({ error: 'Invalid prospectus currency' });
  }
  if (!isProspectusCategory(category)) {
    return res.status(400).json({ error: 'Invalid prospectus category' });
  }

  try {
    const { bytes } = await downloadProspectusAsset(normalizedCurrency, category);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="zurichjs-sponsorship-prospectus-${category}-${normalizedCurrency.toLowerCase()}.pdf"`,
    );
    res.setHeader('Content-Length', bytes.length);
    return res.status(200).send(bytes);
  } catch (error) {
    log.error('Failed to download prospectus', error, { currency: normalizedCurrency, category });
    return res.status(404).json({ error: 'Prospectus not found' });
  }
}
