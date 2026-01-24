/**
 * Partnership Module
 * Re-exports all partnership functionality
 */

// Partnership CRUD operations
export {
  listPartnerships,
  getPartnership,
  getPartnershipWithDetails,
  createPartnership,
  updatePartnership,
  deletePartnership,
  generateTrackingUrl,
  getPartnershipStats,
} from './partnerships';

// Public partnership data
export { getPublicCommunityPartners } from './public';
export type { PublicCommunityPartner } from './public';

// Coupon operations
export {
  listCoupons,
  getStripeProducts,
  createCoupon,
  deactivateCoupon,
  syncCouponRedemptions,
  deleteCoupon,
  formatDiscount,
} from './coupons';

// Voucher operations
export {
  listVouchers,
  getVoucher,
  getVoucherByCode,
  createVouchers,
  markVoucherRedeemed,
  deleteVoucher,
  formatVoucherValue,
  getVoucherStats,
} from './vouchers';

// Email operations
export {
  sendPartnershipEmail,
  getEmailHistory,
} from './email';

// Analytics operations
export {
  getPartnershipAnalytics,
  getAggregatePartnershipStats,
} from './analytics';
