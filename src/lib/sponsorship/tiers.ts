/**
 * Sponsorship Tiers Business Logic
 * Operations for sponsorship tier reference data
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { SponsorshipTier } from '@/lib/types/sponsorship';

/**
 * List all active sponsorship tiers
 *
 * @returns Array of active tiers sorted by display order
 */
export async function listTiers(): Promise<SponsorshipTier[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('sponsorship_tiers')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching sponsorship tiers:', error);
    throw new Error(`Failed to fetch sponsorship tiers: ${error.message}`);
  }

  return data as SponsorshipTier[];
}

/**
 * Get a single tier by ID
 *
 * @param tierId - Tier ID (e.g., 'gold', 'platinum')
 * @returns Tier or null if not found
 */
export async function getTier(tierId: string): Promise<SponsorshipTier | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('sponsorship_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching tier:', error);
    throw new Error(`Failed to fetch tier: ${error.message}`);
  }

  return data as SponsorshipTier;
}
