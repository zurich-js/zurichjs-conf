import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Json } from '@/lib/types/database.generated';
import type { NetworkingSettings, SponsorNetworkingProfile } from '@/lib/types/networking';
import {
  sponsorNetworkingProfileSchema,
  sponsorNetworkingUpdateSchema,
} from '@/lib/validations/networking';

const log = logger.scope('Sponsor Networking API');

const EMPTY_PROFILE: SponsorNetworkingProfile = {
  contactName: null,
  email: null,
  phone: null,
  websiteUrl: null,
  linkedinUrl: null,
  preferredMethod: null,
};

interface NetworkingRow {
  share_id: string;
  enabled: boolean;
  profile: unknown;
}

function emptySettings(): NetworkingSettings<SponsorNetworkingProfile> {
  return {
    shareId: null,
    enabled: false,
    profile: EMPTY_PROFILE,
  };
}

function settingsFromRow(
  row: NetworkingRow
): NetworkingSettings<SponsorNetworkingProfile> | null {
  const result = sponsorNetworkingProfileSchema.safeParse(row.profile);
  if (!result.success) return null;

  return {
    shareId: row.share_id,
    enabled: row.enabled,
    profile: result.data,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sponsorId = req.query.id;
  if (typeof sponsorId !== 'string') {
    return res.status(400).json({ error: 'Missing sponsor ID' });
  }

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const updateResult = req.method === 'PUT'
    ? sponsorNetworkingUpdateSchema.safeParse(req.body)
    : null;
  if (updateResult && !updateResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: updateResult.error.issues,
    });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: sponsor, error: sponsorError } = await supabase
      .from('sponsors')
      .select('id')
      .eq('id', sponsorId)
      .maybeSingle();

    if (sponsorError) {
      log.error('Failed to verify sponsor for networking settings', sponsorError, { sponsorId });
      return res.status(500).json({ error: 'Failed to load sponsor' });
    }

    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('networking_profiles')
        .select('share_id, enabled, profile')
        .eq('sponsor_id', sponsorId)
        .eq('subject_type', 'sponsor')
        .maybeSingle();

      if (error) {
        log.error('Failed to load sponsor networking settings', error, { sponsorId });
        return res.status(500).json({ error: 'Failed to load networking settings' });
      }

      if (!data) {
        return res.status(200).json(emptySettings());
      }

      const settings = settingsFromRow(data);
      if (!settings) {
        log.error('Stored sponsor networking profile is invalid', new Error('Invalid profile'), {
          sponsorId,
        });
        return res.status(500).json({ error: 'Failed to load networking settings' });
      }

      return res.status(200).json(settings);
    }

    if (!updateResult?.success) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const { data, error } = await supabase
      .from('networking_profiles')
      .upsert(
        {
          subject_type: 'sponsor',
          sponsor_id: sponsorId,
          enabled: updateResult.data.enabled,
          profile: updateResult.data.profile as unknown as Json,
        },
        { onConflict: 'sponsor_id' }
      )
      .select('share_id, enabled, profile')
      .single();

    if (error || !data) {
      log.error('Failed to save sponsor networking settings', error, { sponsorId });
      return res.status(500).json({ error: 'Failed to save networking settings' });
    }

    const settings = settingsFromRow(data);
    if (!settings) {
      log.error('Saved sponsor networking profile is invalid', new Error('Invalid profile'), {
        sponsorId,
      });
      return res.status(500).json({ error: 'Failed to save networking settings' });
    }

    return res.status(200).json(settings);
  } catch (error) {
    log.error('Unexpected sponsor networking failure', error, { sponsorId });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
