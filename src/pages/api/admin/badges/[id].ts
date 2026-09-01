import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { BADGE_LOGO_BUCKET, badgeLogoDirectory } from '@/lib/badges/logo-storage';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';
import { manualBadgeEntrySchema } from '@/lib/validations/badges';

const log = logger.scope('Admin Manual Badge API');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || isBot) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'PUT, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id || !UUID_PATTERN.test(id)) {
    res.status(400).json({ error: 'Invalid manual badge ID' });
    return;
  }

  try {
    const client = createServiceRoleClient();
    if (req.method === 'DELETE') {
      const { error } = await client.from('manual_badge_entries').delete().eq('id', id);
      if (error) throw error;
      const { error: codeError } = await client.from('badge_qr_codes')
        .delete()
        .eq('subject_key', `manual:${id}`);
      if (codeError) throw codeError;
      const logoDirectory = badgeLogoDirectory(id);
      const { data: logoFiles } = await client.storage.from(BADGE_LOGO_BUCKET).list(logoDirectory);
      if (logoFiles?.length) {
        const { error: logoError } = await client.storage.from(BADGE_LOGO_BUCKET)
          .remove(logoFiles.map((file) => `${logoDirectory}/${file.name}`));
        if (logoError) log.warn('Manual badge deleted but logo cleanup failed', { id, error: logoError });
      }
      res.status(204).end();
      return;
    }

    const result = manualBadgeEntrySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
      return;
    }
    const input = result.data;
    const { data, error } = await client.from('manual_badge_entries').update({
      category: input.category,
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.role,
      company: input.company,
      logo_url: input.logoUrl,
      networking_enabled: input.networkingEnabled,
      networking_profile: input.networkingProfile,
    }).eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Manual badge not found' });
      return;
    }
    res.status(200).json({ id });
  } catch (error) {
    log.error('Manual badge request failed', error, { id, method: req.method });
    res.status(500).json({ error: 'Manual badge request failed' });
  }
}
