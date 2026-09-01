import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { loadBadgeReviewRows } from '@/lib/badges/data';
import { loadPublicBadgeSpeakers } from '@/lib/badges/speakers';
import { getBadgeBaseUrl } from '@/lib/badges/url';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';
import { manualBadgeEntrySchema } from '@/lib/validations/badges';

const log = logger.scope('Admin Badge Management API');

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || (req.method !== 'GET' && isBot)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const client = createServiceRoleClient();
    if (req.method === 'GET') {
      const rows = await loadBadgeReviewRows(
        client,
        await loadPublicBadgeSpeakers(),
        getBadgeBaseUrl(req)
      );
      res.status(200).json({ rows });
      return;
    }

    const result = manualBadgeEntrySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
      return;
    }
    const input = result.data;
    const { data: entry, error: insertError } = await client
      .from('manual_badge_entries')
      .insert({
        category: input.category,
        first_name: input.firstName,
        last_name: input.lastName,
        role: input.role,
        company: input.company,
        logo_url: input.logoUrl,
        networking_enabled: input.networkingEnabled,
        networking_profile: input.networkingProfile,
      })
      .select('id, share_id')
      .single();
    if (insertError || !entry) throw insertError ?? new Error('Manual badge row was not returned');

    const { error: codeError } = await client.from('badge_qr_codes').insert({
      subject_key: `manual:${entry.id}`,
      target_public_id: `badge-${entry.share_id}`,
    });
    if (codeError) {
      await client.from('manual_badge_entries').delete().eq('id', entry.id);
      throw codeError;
    }

    res.status(201).json({ id: entry.id });
  } catch (error) {
    log.error('Badge management request failed', error, { method: req.method });
    res.status(500).json({ error: 'Badge management request failed' });
  }
}
