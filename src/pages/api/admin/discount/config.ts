/**
 * Discount Config Admin API
 * GET/PUT /api/admin/discount/config — Read/update the discount popup
 * configuration (singleton discount_config row).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  getDiscountConfigRow,
  updateDiscountConfigRow,
} from '@/lib/discount/config-server';
import { logger } from '@/lib/logger';

const log = logger.scope('DiscountConfigAPI');

// The popup no longer has eligibility gating, so `show_probability`,
// `cooldown_hours` and `force_show` are not accepted here any more — writing
// them would imply behaviour that no longer exists.
const updateConfigSchema = z.object({
  percent_off: z.number().int().min(1).max(100).optional(),
  duration_minutes: z.number().int().min(1).optional(),
  ab_percent_off: z.number().int().min(1).max(100).optional(),
  ab_duration_minutes: z.number().int().min(1).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const config = await getDiscountConfigRow();
      return res.status(200).json(config);
    }

    if (req.method === 'PUT') {
      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      }

      const config = await updateDiscountConfigRow(parsed.data);
      return res.status(200).json(config);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    log.error('Discount config API error', error as Error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
