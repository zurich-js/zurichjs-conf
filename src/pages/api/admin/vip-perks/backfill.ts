/**
 * VIP Perks Backfill API
 * POST /api/admin/vip-perks/backfill — Backfill VIP perks for existing VIP tickets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { backfillVipPerks } from '@/lib/vip-perks';
import { logger } from '@/lib/logger';

const log = logger.scope('VipPerksBackfillAPI');

const backfillSchema = z.object({
  dry_run: z.boolean().optional(),
  send_emails: z.boolean().optional(),
  custom_message: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const parsed = backfillSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }

    const result = await backfillVipPerks(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    log.error('VIP perks backfill error', error as Error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
