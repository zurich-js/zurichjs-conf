/**
 * Partnership Analytics
 * Functions for retrieving partnership analytics and statistics.
 * Gracefully handles cases where partnership tracking columns may not exist.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { serverAnalytics } from '@/lib/analytics/server';
import type {
  Partnership,
  PartnershipCoupon,
  PartnershipVoucher,
  PartnershipAnalyticsResponse,
  VoucherPurpose,
} from '@/lib/types/partnership';

// Types for ticket data with partnership fields
interface TicketWithPartnership {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  ticket_category: string;
  ticket_stage: string;
  amount_paid: number;
  discount_amount: number;
  coupon_code: string | null;
  partnership_coupon_id: string | null;
  partnership_voucher_id: string | null;
  partnership_id: string | null;
  created_at: string;
}

interface AggregateTicket {
  partnership_id: string;
  amount_paid: number;
  discount_amount: number;
}

interface AggregateCoupon {
  current_redemptions: number;
}

interface AggregateVoucher {
  is_redeemed: boolean;
  amount: number;
}

/** Check if error is due to missing schema columns */
function isSchemaError(error: { message?: string } | null): boolean {
  return !!error?.message?.includes('schema cache');
}

/** Track schema error silently */
function trackSchemaError(context?: string): void {
  serverAnalytics.error('system', `Partnership columns missing: ${context || 'query'}`, {
    type: 'system',
    severity: 'low',
    code: 'SCHEMA_CACHE_MISSING_COLUMNS',
  }).catch(() => {});
}

/**
 * Get comprehensive analytics for a specific partnership
 */
export async function getPartnershipAnalytics(
  partnershipId: string
): Promise<PartnershipAnalyticsResponse | null> {
  const supabase = createServiceRoleClient();

  // Fetch partnership
  const { data: partnership, error: partnershipError } = await supabase
    .from('partnerships' as 'tickets')
    .select('*')
    .eq('id', partnershipId)
    .single();

  if (partnershipError || !partnership) {
    console.error('Failed to fetch partnership:', partnershipError);
    return null;
  }

  // Fetch coupons and vouchers
  const [{ data: coupons }, { data: vouchers }] = await Promise.all([
    supabase
      .from('partnership_coupons' as 'tickets')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false }),
    supabase
      .from('partnership_vouchers' as 'tickets')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false }),
  ]);

  // Fetch tickets with partnership tracking (may fail if columns don't exist)
  let tickets: TicketWithPartnership[] = [];
  const { data: ticketsRaw, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, email, first_name, last_name, ticket_category, ticket_stage, amount_paid, discount_amount, coupon_code, partnership_coupon_id, partnership_voucher_id, partnership_id, created_at')
    .eq('partnership_id', partnershipId)
    .order('created_at', { ascending: false });

  if (ticketsError) {
    if (isSchemaError(ticketsError)) {
      trackSchemaError('partnership analytics');
    } else {
      console.error('[PartnershipAnalytics] Error fetching tickets:', ticketsError);
    }
  } else {
    tickets = (ticketsRaw || []) as unknown as TicketWithPartnership[];
  }

  // Process data
  const couponList = (coupons || []) as unknown as PartnershipCoupon[];
  const voucherList = (vouchers || []) as unknown as PartnershipVoucher[];
  const activeCoupons = couponList.filter((c) => c.is_active);
  const redeemedVouchers = voucherList.filter((v) => v.is_redeemed);

  // Calculate coupon discount map
  const couponDiscountMap: Record<string, number> = {};
  for (const ticket of tickets) {
    if (ticket.partnership_coupon_id && ticket.discount_amount) {
      couponDiscountMap[ticket.partnership_coupon_id] =
        (couponDiscountMap[ticket.partnership_coupon_id] || 0) + ticket.discount_amount;
    }
  }

  // Group vouchers by purpose
  const byPurpose: Record<VoucherPurpose, { total: number; redeemed: number; value: number }> = {
    community_discount: { total: 0, redeemed: 0, value: 0 },
    raffle: { total: 0, redeemed: 0, value: 0 },
    giveaway: { total: 0, redeemed: 0, value: 0 },
    organizer_discount: { total: 0, redeemed: 0, value: 0 },
  };

  for (const voucher of voucherList) {
    const purpose = voucher.purpose as VoucherPurpose;
    if (byPurpose[purpose]) {
      byPurpose[purpose].total++;
      byPurpose[purpose].value += voucher.amount || 0;
      if (voucher.is_redeemed) byPurpose[purpose].redeemed++;
    }
  }

  const grossRevenue = tickets.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
  const totalDiscounts = tickets.reduce((sum, t) => sum + (t.discount_amount || 0), 0);

  return {
    partnership: partnership as unknown as Partnership,
    summary: {
      totalTicketsSold: tickets.length,
      grossRevenue,
      totalDiscountsGiven: totalDiscounts,
      netRevenue: grossRevenue,
      totalCouponRedemptions: couponList.reduce((sum, c) => sum + (c.current_redemptions || 0), 0),
      totalVouchersRedeemed: redeemedVouchers.length,
    },
    coupons: {
      total: couponList.length,
      active: activeCoupons.length,
      byCode: couponList.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        discountPercent: c.discount_percent,
        discountAmount: c.discount_amount,
        currency: c.currency,
        redemptions: c.current_redemptions || 0,
        maxRedemptions: c.max_redemptions,
        discountGiven: couponDiscountMap[c.id] || 0,
        isActive: c.is_active,
      })),
    },
    vouchers: {
      total: voucherList.length,
      redeemed: redeemedVouchers.length,
      unredeemed: voucherList.length - redeemedVouchers.length,
      totalValueIssued: voucherList.reduce((sum, v) => sum + (v.amount || 0), 0),
      totalValueRedeemed: redeemedVouchers.reduce((sum, v) => sum + (v.amount || 0), 0),
      byPurpose,
      redemptions: redeemedVouchers.map((v) => ({
        id: v.id,
        code: v.code,
        purpose: v.purpose,
        value: v.amount,
        currency: v.currency,
        redeemedAt: v.redeemed_at,
        redeemedByEmail: v.redeemed_by_email,
      })),
    },
    tickets: {
      total: tickets.length,
      recent: tickets.slice(0, 10).map((t) => ({
        id: t.id,
        email: t.email,
        firstName: t.first_name,
        lastName: t.last_name,
        ticketCategory: t.ticket_category,
        ticketStage: t.ticket_stage,
        amountPaid: t.amount_paid,
        discountAmount: t.discount_amount || 0,
        couponCode: t.coupon_code || undefined,
        createdAt: t.created_at,
      })),
    },
  };
}

/**
 * Get aggregate analytics across all partnerships
 */
export async function getAggregatePartnershipStats() {
  const supabase = createServiceRoleClient();

  // Fetch tickets with partnership links (may fail if columns don't exist)
  let ticketList: AggregateTicket[] = [];
  const { data: ticketsRaw, error: ticketsError } = await supabase
    .from('tickets')
    .select('partnership_id, amount_paid, discount_amount')
    .not('partnership_id', 'is', null);

  if (ticketsError) {
    if (isSchemaError(ticketsError)) {
      trackSchemaError('aggregate stats');
    } else {
      console.error('[PartnershipAnalytics] Error fetching aggregate tickets:', ticketsError);
    }
  } else {
    ticketList = (ticketsRaw || []) as unknown as AggregateTicket[];
  }

  // Fetch coupon and voucher data
  const [{ data: couponsRaw }, { data: vouchersRaw }] = await Promise.all([
    supabase.from('partnership_coupons' as 'tickets').select('current_redemptions'),
    supabase.from('partnership_vouchers' as 'tickets').select('is_redeemed, amount'),
  ]);

  const couponList = (couponsRaw || []) as unknown as AggregateCoupon[];
  const voucherList = (vouchersRaw || []) as unknown as AggregateVoucher[];
  const redeemedVouchers = voucherList.filter((v) => v.is_redeemed);

  // Group by partnership for top performers
  const partnershipRevenue: Record<string, number> = {};
  for (const ticket of ticketList) {
    if (ticket.partnership_id) {
      partnershipRevenue[ticket.partnership_id] =
        (partnershipRevenue[ticket.partnership_id] || 0) + (ticket.amount_paid || 0);
    }
  }

  return {
    totalTicketsFromPartnerships: ticketList.length,
    totalRevenue: ticketList.reduce((sum, t) => sum + (t.amount_paid || 0), 0),
    totalDiscounts: ticketList.reduce((sum, t) => sum + (t.discount_amount || 0), 0),
    totalCouponRedemptions: couponList.reduce((sum, c) => sum + (c.current_redemptions || 0), 0),
    totalVouchersRedeemed: redeemedVouchers.length,
    totalVoucherValueRedeemed: redeemedVouchers.reduce((sum, v) => sum + (v.amount || 0), 0),
    topPartnershipsByRevenue: Object.entries(partnershipRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, revenue]) => ({ partnershipId: id, revenue })),
  };
}
