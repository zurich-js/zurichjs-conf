/**
 * Sponsors Business Logic
 * CRUD operations for sponsor management
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  Sponsor,
  CreateSponsorRequest,
  UpdateSponsorRequest,
  ListSponsorsQuery,
  ListSponsorsResponse,
  PublicSponsor,
} from '@/lib/types/sponsorship';
import { TIER_DISPLAY_CONFIG } from '@/lib/types/sponsorship';

/**
 * Create a new sponsor
 *
 * @param data - Sponsor creation data
 * @returns Created sponsor
 */
export async function createSponsor(data: CreateSponsorRequest): Promise<Sponsor> {
  const supabase = createServiceRoleClient();

  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .insert({
      company_name: data.companyName,
      company_website: data.companyWebsite || null,
      vat_id: data.vatId || null,
      billing_address_street: data.billingAddress.street,
      billing_address_city: data.billingAddress.city,
      billing_address_postal_code: data.billingAddress.postalCode,
      billing_address_country: data.billingAddress.country,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone || null,
      internal_notes: data.internalNotes || null,
      is_logo_public: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating sponsor:', error);
    throw new Error(`Failed to create sponsor: ${error.message}`);
  }

  return sponsor as Sponsor;
}

/**
 * Get a single sponsor by ID
 *
 * @param sponsorId - UUID of the sponsor
 * @returns Sponsor or null if not found
 */
export async function getSponsor(sponsorId: string): Promise<Sponsor | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .eq('id', sponsorId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching sponsor:', error);
    throw new Error(`Failed to fetch sponsor: ${error.message}`);
  }

  return data as Sponsor;
}

/**
 * Update a sponsor
 *
 * @param sponsorId - UUID of the sponsor
 * @param data - Update data
 * @returns Updated sponsor
 */
export async function updateSponsor(
  sponsorId: string,
  data: UpdateSponsorRequest
): Promise<Sponsor> {
  const supabase = createServiceRoleClient();

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};

  if (data.companyName !== undefined) updateData.company_name = data.companyName;
  if (data.companyWebsite !== undefined) updateData.company_website = data.companyWebsite;
  if (data.vatId !== undefined) updateData.vat_id = data.vatId;
  if (data.contactName !== undefined) updateData.contact_name = data.contactName;
  if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail;
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
  if (data.internalNotes !== undefined) updateData.internal_notes = data.internalNotes;
  if (data.isLogoPublic !== undefined) updateData.is_logo_public = data.isLogoPublic;

  // Handle partial billing address updates
  if (data.billingAddress) {
    if (data.billingAddress.street !== undefined) {
      updateData.billing_address_street = data.billingAddress.street;
    }
    if (data.billingAddress.city !== undefined) {
      updateData.billing_address_city = data.billingAddress.city;
    }
    if (data.billingAddress.postalCode !== undefined) {
      updateData.billing_address_postal_code = data.billingAddress.postalCode;
    }
    if (data.billingAddress.country !== undefined) {
      updateData.billing_address_country = data.billingAddress.country;
    }
  }

  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .update(updateData)
    .eq('id', sponsorId)
    .select()
    .single();

  if (error) {
    console.error('Error updating sponsor:', error);
    throw new Error(`Failed to update sponsor: ${error.message}`);
  }

  return sponsor as Sponsor;
}

/**
 * Update sponsor logo URL
 *
 * @param sponsorId - UUID of the sponsor
 * @param logoUrl - New logo URL (or null to remove)
 * @returns Updated sponsor
 */
export async function updateSponsorLogo(
  sponsorId: string,
  logoUrl: string | null
): Promise<Sponsor> {
  const supabase = createServiceRoleClient();

  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .update({ logo_url: logoUrl })
    .eq('id', sponsorId)
    .select()
    .single();

  if (error) {
    console.error('Error updating sponsor logo:', error);
    throw new Error(`Failed to update sponsor logo: ${error.message}`);
  }

  return sponsor as Sponsor;
}

/**
 * Toggle logo public visibility
 *
 * @param sponsorId - UUID of the sponsor
 * @param isPublic - Whether the logo should be publicly displayed
 * @returns Updated sponsor
 */
export async function toggleLogoPublic(
  sponsorId: string,
  isPublic: boolean
): Promise<Sponsor> {
  const supabase = createServiceRoleClient();

  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .update({ is_logo_public: isPublic })
    .eq('id', sponsorId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling logo visibility:', error);
    throw new Error(`Failed to toggle logo visibility: ${error.message}`);
  }

  return sponsor as Sponsor;
}

/**
 * List sponsors with filtering and pagination
 *
 * @param query - Query parameters
 * @returns Sponsors list with total count
 */
export async function listSponsors(
  query: ListSponsorsQuery = {}
): Promise<ListSponsorsResponse> {
  const supabase = createServiceRoleClient();
  const { search, hasPublicLogo, page = 1, limit = 20 } = query;

  let queryBuilder = supabase
    .from('sponsors')
    .select('*', { count: 'exact' });

  // Apply filters
  if (search) {
    queryBuilder = queryBuilder.or(
      `company_name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`
    );
  }

  if (hasPublicLogo !== undefined) {
    queryBuilder = queryBuilder.eq('is_logo_public', hasPublicLogo);
  }

  // Apply pagination
  const offset = (page - 1) * limit;
  queryBuilder = queryBuilder
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('Error listing sponsors:', error);
    throw new Error(`Failed to list sponsors: ${error.message}`);
  }

  return {
    sponsors: data as Sponsor[],
    total: count || 0,
  };
}

/**
 * Delete a sponsor
 * Only allowed if sponsor has no deals
 *
 * @param sponsorId - UUID of the sponsor
 */
export async function deleteSponsor(sponsorId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Check if sponsor has any deals
  const { data: deals, error: dealsError } = await supabase
    .from('sponsorship_deals')
    .select('id')
    .eq('sponsor_id', sponsorId)
    .limit(1);

  if (dealsError) {
    throw new Error(`Failed to check sponsor deals: ${dealsError.message}`);
  }

  if (deals && deals.length > 0) {
    throw new Error('Cannot delete sponsor with existing deals');
  }

  const { error } = await supabase
    .from('sponsors')
    .delete()
    .eq('id', sponsorId);

  if (error) {
    console.error('Error deleting sponsor:', error);
    throw new Error(`Failed to delete sponsor: ${error.message}`);
  }
}

/**
 * Get public sponsors for homepage display
 * Returns sponsors with is_logo_public=true and a paid deal
 *
 * @returns Array of public sponsor data for display
 */
export async function getPublicSponsors(): Promise<PublicSponsor[]> {
  const supabase = createServiceRoleClient();

  // Get sponsors with public logos that have at least one paid deal
  const { data, error } = await supabase
    .from('sponsors')
    .select(`
      id,
      company_name,
      company_website,
      logo_url,
      sponsorship_deals!inner(tier_id, status)
    `)
    .eq('is_logo_public', true)
    .not('logo_url', 'is', null)
    .eq('sponsorship_deals.status', 'paid');

  if (error) {
    console.error('Error fetching public sponsors:', error);
    throw new Error(`Failed to fetch public sponsors: ${error.message}`);
  }

  // Transform to public format
  return (data || []).map((sponsor) => {
    // Get the tier from the first paid deal
    const deals = sponsor.sponsorship_deals as Array<{ tier_id: string; status: string }>;
    const tierId = deals[0]?.tier_id || 'bronze';
    const displayConfig = TIER_DISPLAY_CONFIG[tierId] || TIER_DISPLAY_CONFIG.bronze;

    return {
      id: sponsor.id,
      name: sponsor.company_name,
      logo: sponsor.logo_url!,
      url: sponsor.company_website,
      tier: tierId,
      width: displayConfig.width,
      height: displayConfig.height,
    };
  });
}
