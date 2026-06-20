/**
 * Referral Programme Types
 */

import { z } from 'zod';

export interface Referrer {
  id: string;
  ticket_id: string;
  email: string;
  first_name: string;
  last_name: string;
  referral_code: string;
  total_referrals: number;
  current_tier: number;
  active_voucher_stripe_coupon_id: string | null;
  active_voucher_stripe_promotion_code_id: string | null;
  active_voucher_code: string | null;
  active_voucher_amount: number;
  active_voucher_currency: string | null;
  active_voucher_redeemed: boolean;
  active_voucher_redeemed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralConversion {
  id: string;
  referrer_id: string;
  referee_ticket_id: string | null;
  referee_email: string;
  referee_stripe_session_id: string;
  reward_tier: number;
  reward_amount: number;
  reward_currency: string;
  created_at: string;
}

export interface ReferralTier {
  min_referrals: number;
  max_referrals: number | null;
  reward_amount_chf: number;
  reward_amount_eur: number;
  reward_amount_gbp: number;
  reward_amount_usd: number;
}

export interface ReferralConfig {
  id: string;
  is_active: boolean;
  referee_discount_percent: number;
  tiers: ReferralTier[];
  reward_restricted_product_ids: string[];
  expires_at: string | null;
  updated_at: string;
}

export const referralTierSchema = z.object({
  min_referrals: z.number().int().positive(),
  max_referrals: z.number().int().positive().nullable(),
  reward_amount_chf: z.number().int().nonnegative(),
  reward_amount_eur: z.number().int().nonnegative(),
  reward_amount_gbp: z.number().int().nonnegative(),
  reward_amount_usd: z.number().int().nonnegative(),
});

export const referralConfigSchema = z.object({
  is_active: z.boolean(),
  referee_discount_percent: z.number().int().min(1).max(100),
  tiers: z.array(referralTierSchema).min(1),
  reward_restricted_product_ids: z.array(z.string()),
});
