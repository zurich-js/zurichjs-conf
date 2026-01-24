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
 * Top performing partnership
 */
export interface TopPartnership {
  partnershipId: string;
  name: string;
  ticketsSold: number;
  revenue: number;
}

/**
 * Partnership statistics
 */
export interface PartnershipStatsResponse {
  total: number;
  byType: Record<PartnershipType, number>;
  byStatus: Record<PartnershipStatus, number>;
  activeCoupons: number;
  activeVouchers: number;
  totalCouponRedemptions: number;
  totalVoucherRedemptions: number;
  totalDiscountGiven: number;
  totalTicketsSold: number;
  totalRevenue: number;
  topPartnerships: TopPartnership[];
}

/**
 * Get partnership statistics
 * Counts coupon uses by cross-referencing ticket coupon_code with partnership_coupons
 */
export async function getPartnershipStats(): Promise<PartnershipStatsResponse> {
  const supabase = createServiceRoleClient();

  const [
    partnershipsResult,
    couponsResult,
    vouchersResult,
    partnershipTicketsResult,
    couponTicketsResult,
  ] = await Promise.all([
    supabase.from('partnerships').select('id, name, type, status'),
    supabase.from('partnership_coupons').select('code, is_active'),
    supabase.from('partnership_vouchers').select('amount, is_redeemed'),
    // Tickets linked via partnership_id (for revenue/top performers)
    supabase
      .from('tickets')
      .select('partnership_id, amount_paid, discount_amount')
      .not('partnership_id', 'is', null)
      .eq('status', 'confirmed'),
    // Tickets with any coupon code (to cross-reference)
    supabase
      .from('tickets')
      .select('coupon_code, discount_amount')
      .not('coupon_code', 'is', null)
      .eq('status', 'confirmed'),
  ]);

  if (partnershipsResult.error) {
    log.error('Failed to get partnerships', partnershipsResult.error);
    throw new Error(`Failed to get partnerships: ${partnershipsResult.error.message}`);
  }

  const partnerships = partnershipsResult.data || [];
  const coupons = couponsResult.data || [];
  const vouchers = vouchersResult.data || [];
  const partnershipTickets = partnershipTicketsResult.data || [];
  const couponTickets = couponTicketsResult.data || [];

  // Build set of valid partnership coupon codes (uppercase for matching)
  const partnerCouponCodes = new Set(
    coupons.map((c) => c.code?.toUpperCase()).filter(Boolean)
  );

  // Count partnerships by type/status
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
  const nameMap: Record<string, string> = {};

  for (const p of partnerships) {
    byType[p.type as PartnershipType]++;
    byStatus[p.status as PartnershipStatus]++;
    nameMap[p.id] = p.name;
  }

  // Coupon stats: count tickets with coupon_code matching a partnership coupon
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  let totalCouponRedemptions = 0;
  let couponDiscountTotal = 0;

  for (const ticket of couponTickets) {
    const code = ticket.coupon_code?.toUpperCase();
    if (code && partnerCouponCodes.has(code)) {
      totalCouponRedemptions++;
      couponDiscountTotal += ticket.discount_amount || 0;
    }
  }

  // Voucher stats
  const redeemedVouchers = vouchers.filter((v) => v.is_redeemed);
  const activeVouchers = vouchers.filter((v) => !v.is_redeemed).length;
  const totalVoucherRedemptions = redeemedVouchers.length;
  const voucherValueRedeemed = redeemedVouchers.reduce(
    (sum, v) => sum + (v.amount || 0),
    0
  );

  // Ticket stats from partnership-linked tickets
  const totalTicketsSold = partnershipTickets.length;
  const totalRevenue = partnershipTickets.reduce(
    (sum, t) => sum + (t.amount_paid || 0),
    0
  );
  const partnershipDiscountTotal = partnershipTickets.reduce(
    (sum, t) => sum + (t.discount_amount || 0),
    0
  );

  // Top performers
  const statsMap: Record<string, { tickets: number; revenue: number }> = {};
  for (const t of partnershipTickets) {
    if (!t.partnership_id) continue;
    if (!statsMap[t.partnership_id]) {
      statsMap[t.partnership_id] = { tickets: 0, revenue: 0 };
    }
    statsMap[t.partnership_id].tickets++;
    statsMap[t.partnership_id].revenue += t.amount_paid || 0;
  }

  const topPartnerships: TopPartnership[] = Object.entries(statsMap)
    .sort(([, a], [, b]) => b.tickets - a.tickets)
    .slice(0, 5)
    .map(([id, s]) => ({
      partnershipId: id,
      name: nameMap[id] || 'Unknown',
      ticketsSold: s.tickets,
      revenue: s.revenue,
    }));

  // Use max of partnership ticket discounts or coupon discounts (avoid double-counting)
  const totalDiscountGiven =
    Math.max(partnershipDiscountTotal, couponDiscountTotal) + voucherValueRedeemed;

  return {
    total: partnerships.length,
    byType,
    byStatus,
    activeCoupons,
    activeVouchers,
    totalCouponRedemptions,
    totalVoucherRedemptions,
    totalDiscountGiven,
    totalTicketsSold,
    totalRevenue,
    topPartnerships,
  };
}
