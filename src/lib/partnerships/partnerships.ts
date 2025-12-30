/**
 * Partnership CRUD Operations
 * Handles creation, retrieval, updating, and deletion of partnerships
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type {
  Partnership,
  PartnershipType,
  PartnershipStatus,
  CreatePartnershipRequest,
  UpdatePartnershipRequest,
} from '@/lib/types/partnership';

const log = logger.scope('Partnerships');

interface ListPartnershipsOptions {
  type?: PartnershipType;
  status?: PartnershipStatus;
  search?: string;
  page?: number;
  limit?: number;
}

interface ListPartnershipsResult {
  partnerships: Partnership[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * List partnerships with optional filtering and pagination
 */
export async function listPartnerships(
  options: ListPartnershipsOptions = {}
): Promise<ListPartnershipsResult> {
  const supabase = createServiceRoleClient();
  const { type, status, search, page = 1, limit = 20 } = options;

  let query = supabase
    .from('partnerships')
    .select('*', { count: 'exact' });

  // Apply filters
  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,company_name.ilike.%${search}%`
    );
  }

  // Apply pagination
  const offset = (page - 1) * limit;
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error('Failed to list partnerships', error);
    throw new Error(`Failed to list partnerships: ${error.message}`);
  }

  return {
    partnerships: (data || []) as Partnership[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get a single partnership by ID
 */
export async function getPartnership(id: string): Promise<Partnership | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('partnerships')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Failed to get partnership', error, { partnershipId: id });
    throw new Error(`Failed to get partnership: ${error.message}`);
  }

  return data as Partnership;
}

/**
 * Get a partnership with its coupons and vouchers
 */
export async function getPartnershipWithDetails(id: string): Promise<Partnership | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('partnerships')
    .select(`
      *,
      coupons:partnership_coupons(*),
      vouchers:partnership_vouchers(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Failed to get partnership with details', error, { partnershipId: id });
    throw new Error(`Failed to get partnership with details: ${error.message}`);
  }

  return data as Partnership;
}

/**
 * Create a new partnership
 */
export async function createPartnership(
  data: CreatePartnershipRequest
): Promise<Partnership> {
  const supabase = createServiceRoleClient();

  // Generate UTM source from name if not provided
  const utmSource = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data: partnership, error } = await supabase
    .from('partnerships')
    .insert({
      name: data.name,
      type: data.type,
      status: 'pending',
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      company_name: data.company_name,
      company_website: data.company_website,
      notes: data.notes,
      utm_source: utmSource,
      utm_medium: 'partner',
      utm_campaign: 'zurichjs-conf-2026',
    })
    .select()
    .single();

  if (error) {
    log.error('Failed to create partnership', error);
    throw new Error(`Failed to create partnership: ${error.message}`);
  }

  log.info('Partnership created', { partnershipId: partnership.id, name: data.name });

  return partnership as Partnership;
}

/**
 * Update an existing partnership
 */
export async function updatePartnership(
  id: string,
  data: UpdatePartnershipRequest
): Promise<Partnership> {
  const supabase = createServiceRoleClient();

  // Build update object, only including defined fields
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.contact_name !== undefined) updateData.contact_name = data.contact_name;
  if (data.contact_email !== undefined) updateData.contact_email = data.contact_email;
  if (data.contact_phone !== undefined) updateData.contact_phone = data.contact_phone;
  if (data.company_name !== undefined) updateData.company_name = data.company_name;
  if (data.company_website !== undefined) updateData.company_website = data.company_website;
  if (data.company_logo_url !== undefined) updateData.company_logo_url = data.company_logo_url;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const { data: partnership, error } = await supabase
    .from('partnerships')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error('Failed to update partnership', error, { partnershipId: id });
    throw new Error(`Failed to update partnership: ${error.message}`);
  }

  log.info('Partnership updated', { partnershipId: id });

  return partnership as Partnership;
}

/**
 * Delete a partnership
 */
export async function deletePartnership(id: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('partnerships')
    .delete()
    .eq('id', id);

  if (error) {
    log.error('Failed to delete partnership', error, { partnershipId: id });
    throw new Error(`Failed to delete partnership: ${error.message}`);
  }

  log.info('Partnership deleted', { partnershipId: id });
}

/**
 * Generate UTM tracking URL for a partnership
 */
export function generateTrackingUrl(
  partnership: Partnership,
  baseUrl: string = 'https://conf.zurichjs.com'
): string {
  const params = new URLSearchParams({
    utm_source: partnership.utm_source,
    utm_medium: partnership.utm_medium,
    utm_campaign: partnership.utm_campaign,
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get partnership statistics
 */
export async function getPartnershipStats(): Promise<{
  total: number;
  byType: Record<PartnershipType, number>;
  byStatus: Record<PartnershipStatus, number>;
  activeCoupons: number;
  activeVouchers: number;
}> {
  const supabase = createServiceRoleClient();

  // Get partnerships count by type and status
  const { data: partnerships, error: partnershipsError } = await supabase
    .from('partnerships')
    .select('type, status');

  if (partnershipsError) {
    log.error('Failed to get partnership stats', partnershipsError);
    throw new Error(`Failed to get partnership stats: ${partnershipsError.message}`);
  }

  // Get active coupons count
  const { count: activeCoupons, error: couponsError } = await supabase
    .from('partnership_coupons')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (couponsError) {
    log.error('Failed to get coupon stats', couponsError);
    throw new Error(`Failed to get coupon stats: ${couponsError.message}`);
  }

  // Get unredeemed vouchers count
  const { count: activeVouchers, error: vouchersError } = await supabase
    .from('partnership_vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('is_redeemed', false);

  if (vouchersError) {
    log.error('Failed to get voucher stats', vouchersError);
    throw new Error(`Failed to get voucher stats: ${vouchersError.message}`);
  }

  // Calculate counts
  const byType: Record<PartnershipType, number> = {
    community: 0,
    individual: 0,
    company: 0,
    sponsor: 0,
  };

  const byStatus: Record<PartnershipStatus, number> = {
    active: 0,
    inactive: 0,
    pending: 0,
    expired: 0,
  };

  for (const p of partnerships || []) {
    byType[p.type as PartnershipType]++;
    byStatus[p.status as PartnershipStatus]++;
  }

  return {
    total: partnerships?.length || 0,
    byType,
    byStatus,
    activeCoupons: activeCoupons || 0,
    activeVouchers: activeVouchers || 0,
  };
}
