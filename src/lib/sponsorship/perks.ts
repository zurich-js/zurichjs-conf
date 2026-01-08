/**
 * Sponsorship Perks Business Logic
 * Operations for managing deal perks/benefits tracking
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  SponsorshipPerk,
  SponsorshipPerkStatus,
  UpdatePerkRequest,
} from '@/lib/types/sponsorship';

/**
 * Default perks template based on tier benefits
 * These are the standard perks that come with each tier
 */
const TIER_PERKS_TEMPLATE: Record<string, Array<{ name: string; description?: string }>> = {
  diamond: [
    { name: '10 conference tickets', description: 'Tickets for team members' },
    { name: '5 reserved workshop seats', description: 'Reserved seats in workshops' },
    { name: '60 sec video ad rotation', description: 'Video advertisement during breaks' },
    { name: '5 min stage slot', description: 'Presentation time on main stage' },
    { name: 'Logo on website', description: 'Premium placement on conference website' },
    { name: 'Logo on event materials', description: 'Inclusion in printed materials' },
    { name: 'Social media mentions', description: 'Promotion on social channels' },
    { name: 'Booth space', description: 'Exhibition booth at venue' },
  ],
  platinum: [
    { name: '8 conference tickets', description: 'Tickets for team members' },
    { name: '3 reserved workshop seats', description: 'Reserved seats in workshops' },
    { name: '30 sec video ad rotation', description: 'Video advertisement during breaks' },
    { name: '2 min stage slot', description: 'Presentation time on main stage' },
    { name: 'Logo on website', description: 'Featured placement on conference website' },
    { name: 'Logo on event materials', description: 'Inclusion in printed materials' },
    { name: 'Social media mentions', description: 'Promotion on social channels' },
  ],
  gold: [
    { name: '6 conference tickets', description: 'Tickets for team members' },
    { name: '1 reserved workshop seat', description: 'Reserved seat in workshop' },
    { name: 'Logo on website', description: 'Placement on conference website' },
    { name: 'Logo on event materials', description: 'Inclusion in printed materials' },
    { name: 'Social media mention', description: 'Promotion on social channels' },
  ],
  silver: [
    { name: '4 conference tickets', description: 'Tickets for team members' },
    { name: 'Logo on website', description: 'Placement on conference website' },
    { name: 'Logo on event materials', description: 'Inclusion in printed materials' },
  ],
  bronze: [
    { name: '2 conference tickets', description: 'Tickets for team members' },
    { name: 'Logo on website', description: 'Placement on conference website' },
  ],
  supporter: [
    { name: '1 conference ticket', description: 'Ticket for team member' },
    { name: 'Logo on website', description: 'Placement on conference website' },
  ],
};

/**
 * Initialize perks for a deal based on its tier
 *
 * @param dealId - UUID of the deal
 * @param tierId - ID of the tier
 * @returns Array of created perks
 */
export async function initializePerksForDeal(
  dealId: string,
  tierId: string
): Promise<SponsorshipPerk[]> {
  const supabase = createServiceRoleClient();

  const perksTemplate = TIER_PERKS_TEMPLATE[tierId] || [];

  if (perksTemplate.length === 0) {
    return [];
  }

  const perksToInsert = perksTemplate.map((perk, index) => ({
    deal_id: dealId,
    name: perk.name,
    description: perk.description || null,
    status: 'pending' as SponsorshipPerkStatus,
    display_order: index,
  }));

  const { data, error } = await supabase
    .from('sponsorship_perks')
    .insert(perksToInsert)
    .select();

  if (error) {
    console.error('Error initializing perks:', error);
    throw new Error(`Failed to initialize perks: ${error.message}`);
  }

  return data as SponsorshipPerk[];
}

/**
 * Add a custom perk to a deal
 *
 * @param dealId - UUID of the deal
 * @param name - Perk name
 * @param description - Optional description
 * @returns Created perk
 */
export async function addPerk(
  dealId: string,
  name: string,
  description?: string
): Promise<SponsorshipPerk> {
  const supabase = createServiceRoleClient();

  // Get the next display order
  const { data: existingPerks } = await supabase
    .from('sponsorship_perks')
    .select('display_order')
    .eq('deal_id', dealId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = existingPerks?.[0]?.display_order
    ? existingPerks[0].display_order + 1
    : 0;

  const { data, error } = await supabase
    .from('sponsorship_perks')
    .insert({
      deal_id: dealId,
      name,
      description: description || null,
      status: 'pending',
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding perk:', error);
    throw new Error(`Failed to add perk: ${error.message}`);
  }

  return data as SponsorshipPerk;
}

/**
 * Update a perk
 *
 * @param perkId - UUID of the perk
 * @param data - Update data
 * @returns Updated perk
 */
export async function updatePerk(
  perkId: string,
  data: UpdatePerkRequest
): Promise<SponsorshipPerk> {
  const supabase = createServiceRoleClient();

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};

  if (data.status !== undefined) {
    updateData.status = data.status;
    // Set completed_at timestamp when marking as completed
    if (data.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }
  }

  if (data.notes !== undefined) updateData.notes = data.notes;

  const { data: perk, error } = await supabase
    .from('sponsorship_perks')
    .update(updateData)
    .eq('id', perkId)
    .select()
    .single();

  if (error) {
    console.error('Error updating perk:', error);
    throw new Error(`Failed to update perk: ${error.message}`);
  }

  return perk as SponsorshipPerk;
}

/**
 * Remove a perk
 *
 * @param perkId - UUID of the perk
 */
export async function removePerk(perkId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('sponsorship_perks')
    .delete()
    .eq('id', perkId);

  if (error) {
    console.error('Error removing perk:', error);
    throw new Error(`Failed to remove perk: ${error.message}`);
  }
}

/**
 * Get all perks for a deal
 *
 * @param dealId - UUID of the deal
 * @returns Array of perks sorted by display order
 */
export async function getPerksForDeal(dealId: string): Promise<SponsorshipPerk[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('sponsorship_perks')
    .select('*')
    .eq('deal_id', dealId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching perks:', error);
    throw new Error(`Failed to fetch perks: ${error.message}`);
  }

  return data as SponsorshipPerk[];
}

/**
 * Get perk completion summary for a deal
 *
 * @param dealId - UUID of the deal
 * @returns Summary of perk completion status
 */
export async function getPerksSummary(
  dealId: string
): Promise<{ total: number; completed: number; pending: number; inProgress: number }> {
  const perks = await getPerksForDeal(dealId);

  return {
    total: perks.length,
    completed: perks.filter((p) => p.status === 'completed').length,
    pending: perks.filter((p) => p.status === 'pending').length,
    inProgress: perks.filter((p) => p.status === 'in_progress').length,
  };
}
