/**
 * Referral Programme Analytics Events
 * Events related to the two-sided referral system
 */

import type { BaseEventProperties } from './base';

export interface ReferralCodeGeneratedEvent {
  event: 'referral_code_generated';
  properties: BaseEventProperties & {
    referral_code: string;
    ticket_id: string;
  };
}

export interface ReferralLinkClickedEvent {
  event: 'referral_link_clicked';
  properties: BaseEventProperties & {
    referral_code: string;
    landing_page?: string;
  };
}

export interface ReferralCodeAppliedEvent {
  event: 'referral_code_applied';
  properties: BaseEventProperties & {
    referral_code: string;
    referee_email?: string;
    discount_percent: number;
  };
}

export interface ReferralConvertedEvent {
  event: 'referral_converted';
  properties: BaseEventProperties & {
    referral_code: string;
    referrer_email: string;
    referee_email: string;
    reward_amount: number;
    reward_tier: number;
    accumulated_total: number;
    reward_currency: string;
  };
}

export interface ReferralVoucherRedeemedEvent {
  event: 'referral_voucher_redeemed';
  properties: BaseEventProperties & {
    referral_code: string;
    voucher_amount: number;
    redeemed_on: 'vip_upgrade' | 'workshop';
  };
}
