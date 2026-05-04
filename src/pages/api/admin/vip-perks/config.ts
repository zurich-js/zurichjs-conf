/**
 * VIP Perks Config API
 * GET/PUT /api/admin/vip-perks/config — Read/update VIP perk configuration
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getVipPerkConfig, updateVipPerkConfig } from '@/lib/vip-perks';
import { logger } from '@/lib/logger';

const log = logger.scope('VipPerksConfigAPI');

const updateConfigSchema = z.object({
  discount_percent: z.number().min(1).max(100).optional(),
  restricted_product_ids: z.array(z.string()).optional(),
  expires_at: z.string().nullable().optional(),
  auto_send_email: z.boolean().optional(),
  custom_email_message: z.string().nullable().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const config = await getVipPerkConfig();
      return res.status(200).json(config);
    }

    if (req.method === 'PUT') {
      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
      }

      const config = await updateVipPerkConfig(parsed.data);
      return res.status(200).json(config);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    log.error('VIP perks config error', error as Error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
