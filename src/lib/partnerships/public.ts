/**
 * Public Partnership Data
 * Functions for fetching public-facing community partner information
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.scope('Public Partnerships');

/**
 * Public community partner data for display
 */
export interface PublicCommunityPartner {
  id: string;
  name: string;
  logo: string;
  website: string | null;
}

/**
 * Get public community partners for homepage display
 * Returns partners with type='community' or 'company', status='active', and a logo
 *
 * @returns Array of public community partner data for display
 */
export async function getPublicCommunityPartners(): Promise<PublicCommunityPartner[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('partnerships')
    .select('id, name, company_logo_url, company_website')
    .in('type', ['community', 'company'])
    .eq('status', 'active')
    .not('company_logo_url', 'is', null)
    .order('name', { ascending: true });

  if (error) {
    log.error('Failed to fetch public community partners', error);
    throw new Error(`Failed to fetch public community partners: ${error.message}`);
  }

  // Transform to public format
  return (data || []).map((partner) => ({
    id: partner.id,
    name: partner.name,
    logo: partner.company_logo_url!,
    website: partner.company_website || null,
  }));
}
