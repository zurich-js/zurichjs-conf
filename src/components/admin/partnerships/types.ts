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
} from '@/lib/types/partnership';

export interface PartnershipStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  activeCoupons: number;
  activeVouchers: number;
}
