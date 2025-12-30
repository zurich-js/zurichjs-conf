/**
 * Partnership Types
 * Types for the partnership management system
 */

/**
 * Partnership type - categorizes the nature of the partnership
 */
export type PartnershipType = 'community' | 'individual' | 'company' | 'sponsor';

/**
 * Partnership status
 */
export type PartnershipStatus = 'active' | 'inactive' | 'pending' | 'expired';

/**
 * Coupon type - distinguishes between discount coupons and fixed-value vouchers
 */
export type CouponType = 'percentage' | 'fixed_amount';

/**
 * Voucher purpose - what the voucher is for
 */
export type VoucherPurpose = 'community_discount' | 'raffle' | 'giveaway' | 'organizer_discount';

/**
 * Currency for fixed amount discounts
 */
export type VoucherCurrency = 'EUR' | 'CHF';

/**
 * Main partnership record
 */
export interface Partnership {
  id: string;
  name: string;
  type: PartnershipType;
  status: PartnershipStatus;

  // Contact information
  contact_name: string;
  contact_email: string;
  contact_phone?: string;

  // Company/organization details (for company/sponsor types)
  company_name?: string;
  company_website?: string;
  company_logo_url?: string;

  // UTM tracking
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;

  // Notes and metadata
  notes?: string;
  metadata?: Record<string, unknown>;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations (populated on fetch)
  coupons?: PartnershipCoupon[];
  vouchers?: PartnershipVoucher[];
}

/**
 * Partnership coupon - Stripe promo codes for partners
 */
export interface PartnershipCoupon {
  id: string;
  partnership_id: string;

  // Stripe IDs
  stripe_coupon_id: string;
  stripe_promotion_code_id?: string;

  // Coupon details
  code: string;
  type: CouponType;
  discount_percent?: number; // For percentage discounts
  discount_amount?: number; // For fixed amount discounts (in cents)
  currency?: VoucherCurrency;

  // Restrictions
  restricted_product_ids: string[]; // Stripe product IDs this coupon applies to
  max_redemptions?: number;
  current_redemptions: number;
  expires_at?: string;

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Partnership voucher - Fixed-value codes for raffles/giveaways
 */
export interface PartnershipVoucher {
  id: string;
  partnership_id: string;

  // Stripe IDs
  stripe_coupon_id: string;
  stripe_promotion_code_id?: string;

  // Voucher details
  code: string;
  purpose: VoucherPurpose;
  amount: number; // In cents
  currency: VoucherCurrency;

  // Recipient info (for organizer discounts)
  recipient_name?: string;
  recipient_email?: string;

  // Status
  is_redeemed: boolean;
  redeemed_at?: string;
  redeemed_by_email?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Partnership analytics/tracking data
 */
export interface PartnershipAnalytics {
  partnership_id: string;

  // Click tracking
  total_clicks: number;
  unique_visitors: number;

  // Conversion tracking
  total_conversions: number;
  total_revenue: number; // In cents
  revenue_currency: VoucherCurrency;

  // Coupon usage
  coupons_redeemed: number;
  vouchers_redeemed: number;

  // Time period
  period_start: string;
  period_end: string;
}

/**
 * Partnership email package - what gets sent to partners
 */
export interface PartnershipEmailPackage {
  partnership_id: string;
  recipient_email: string;
  recipient_name: string;

  // Content
  subject: string;

  // Partnership details for email
  partnership_name: string;
  partnership_type: PartnershipType;

  // Coupon codes to include
  coupon_codes: Array<{
    code: string;
    description: string;
    discount: string; // Human-readable like "20% off" or "CHF 50 off"
    expires_at?: string;
  }>;

  // Voucher codes to include
  voucher_codes: Array<{
    code: string;
    purpose: VoucherPurpose;
    value: string; // Human-readable like "CHF 100"
  }>;

  // UTM links
  tracking_url: string;

  // Assets
  include_logo: boolean;
  include_banner: boolean;
  custom_message?: string;
}

/**
 * Stripe product info for coupon restrictions
 */
export interface StripeProductInfo {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  default_price_id?: string;
  metadata?: Record<string, string>;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Create partnership request
 */
export interface CreatePartnershipRequest {
  name: string;
  type: PartnershipType;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  company_name?: string;
  company_website?: string;
  notes?: string;
}

/**
 * Update partnership request
 */
export interface UpdatePartnershipRequest {
  name?: string;
  type?: PartnershipType;
  status?: PartnershipStatus;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  company_website?: string;
  company_logo_url?: string;
  notes?: string;
}

/**
 * Create coupon request
 */
export interface CreateCouponRequest {
  partnership_id: string;
  code: string;
  type: CouponType;
  discount_percent?: number;
  discount_amount?: number;
  currency?: VoucherCurrency;
  restricted_product_ids: string[];
  max_redemptions?: number;
  expires_at?: string;
}

/**
 * Create voucher request
 */
export interface CreateVoucherRequest {
  partnership_id: string;
  code?: string; // Auto-generated if not provided
  purpose: VoucherPurpose;
  amount: number;
  currency: VoucherCurrency;
  recipient_name?: string;
  recipient_email?: string;
  quantity?: number; // Create multiple vouchers at once
}

/**
 * Send partnership email request
 */
export interface SendPartnershipEmailRequest {
  partnership_id: string;
  include_coupons: boolean;
  include_vouchers: boolean;
  include_logo: boolean;
  include_banner: boolean;
  custom_message?: string;
}
