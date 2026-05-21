/**
 * Public sponsorship prospectus metadata API.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { listProspectusAssets } from '@/lib/sponsorship/prospectus';
import { logger } from '@/lib/logger';

const log = logger.scope('Public Sponsorship Prospectus API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const assets = await listProspectusAssets();
    return res.status(200).json({ assets });
  } catch (error) {
    log.error('Failed to list public prospectus assets', error);
    return res.status(500).json({ error: 'Failed to list prospectus assets' });
  }
}
