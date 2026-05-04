/**
 * VIP Perk Create API
 * POST /api/admin/vip-perks/create — Create a VIP perk for a specific ticket
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createVipPerkCoupon, getVipPerkConfig, sendVipPerkEmail } from '@/lib/vip-perks';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.scope('VipPerksCreateAPI');

const createSchema = z.object({
  ticket_id: z.string().uuid(),
  send_email: z.boolean().optional(),
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
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }

    const { ticket_id, send_email, custom_message } = parsed.data;
    const config = await getVipPerkConfig();

    if (config.restricted_product_ids.length === 0) {
      return res.status(400).json({ error: 'No workshop products configured. Update VIP perk config first.' });
    }

    const perk = await createVipPerkCoupon({
      ticket_id,
      restricted_product_ids: config.restricted_product_ids,
      discount_percent: config.discount_percent,
      expires_at: config.expires_at || undefined,
    });

    let emailResult;
    if (send_email) {
      emailResult = await sendVipPerkEmail({
        vip_perk_id: perk.id,
        custom_message,
      });
    }

    // Re-fetch with joined ticket data to match VipPerkWithTicket shape
    const supabase = createServiceRoleClient();
    const { data: perkWithTicket } = await supabase
      .from('vip_perks')
      .select('*, ticket:tickets!inner(id, first_name, last_name, email, ticket_category, status)')
      .eq('id', perk.id)
      .single();

    return res.status(201).json({ perk: perkWithTicket || perk, email: emailResult });
  } catch (error) {
    log.error('Failed to create VIP perk', error as Error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
