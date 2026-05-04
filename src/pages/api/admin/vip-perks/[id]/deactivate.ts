/**
 * VIP Perk Deactivate API
 * POST /api/admin/vip-perks/[id]/deactivate — Deactivate a VIP perk
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { deactivateVipPerk } from '@/lib/vip-perks';
import { logger } from '@/lib/logger';

const log = logger.scope('VipPerkDeactivateAPI');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const perkId = req.query.id as string;
  if (!perkId) {
    return res.status(400).json({ error: 'Missing perk ID' });
  }

  try {
    await deactivateVipPerk(perkId);
    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Failed to deactivate VIP perk', error as Error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'VIP perk not found' ? 404 : 500;
    return res.status(status).json({ error: message });
  }
}
