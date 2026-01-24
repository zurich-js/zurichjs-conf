/**
 * Partnership Admin Component Types
 */

export type {
  Partnership,
  PartnershipType,
  PartnershipStatus,
  PartnershipCoupon,
  PartnershipVoucher,
  CouponType,
  VoucherPurpose,
  VoucherCurrency,
  StripeProductInfo,
  CreatePartnershipRequest,
  UpdatePartnershipRequest,
  CreateCouponRequest,
  CreateVoucherRequest,
  PartnershipAnalyticsResponse,
} from '@/lib/types/partnership';

export interface TopPartnership {
  partnershipId: string;
  name: string;
  ticketsSold: number;
  revenue: number;
}

export interface PartnershipStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  activeCoupons: number;
  activeVouchers: number;
  // Cumulative analytics
  totalCouponRedemptions: number;
  totalVoucherRedemptions: number;
  totalDiscountGiven: number; // In cents
  // Ticket-based analytics
  totalTicketsSold: number;
  totalRevenue: number; // In cents
  topPartnerships: TopPartnership[];
}
