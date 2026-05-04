/**
 * VIP Perk Email API
 * POST /api/admin/vip-perks/[id]/email — Send/resend VIP perk email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { sendVipPerkEmail } from '@/lib/vip-perks';
import { logger } from '@/lib/logger';

const log = logger.scope('VipPerkEmailAPI');

const emailSchema = z.object({
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

  const perkId = req.query.id as string;
  if (!perkId) {
    return res.status(400).json({ error: 'Missing perk ID' });
  }

  try {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }

    const result = await sendVipPerkEmail({
      vip_perk_id: perkId,
      custom_message: parsed.data.custom_message,
    });

    if (!result.success) {
      const status = result.error === 'VIP perk not found' ? 404 : 500;
      return res.status(status).json({ error: result.error || 'Failed to send email' });
    }

    return res.status(200).json({ success: true, messageId: result.messageId });
  } catch (error) {
    log.error('Failed to send VIP perk email', error as Error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
