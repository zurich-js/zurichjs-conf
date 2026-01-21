/**
 * Workshop Analytics Events
 * Events related to workshop viewing, registration, and vouchers
 */

import type {
  BaseEventProperties,
  WorkshopProperties,
  PaymentProperties,
  RevenueProperties,
  UserProperties,
} from './base';

export interface WorkshopViewedEvent {
  event: 'workshop_viewed';
  properties: BaseEventProperties & WorkshopProperties;
}

export interface WorkshopVoucherPurchasedEvent {
  event: 'workshop_voucher_purchased';
  properties: BaseEventProperties &
    WorkshopProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      voucher_code?: string;
      voucher_count: number;
    };
}

export interface WorkshopRegisteredEvent {
  event: 'workshop_registered';
  properties: BaseEventProperties &
    WorkshopProperties &
    UserProperties & {
      voucher_code?: string;
      registration_status: 'confirmed' | 'waitlist';
    };
}

export interface WorkshopCancelledEvent {
  event: 'workshop_cancelled';
  properties: BaseEventProperties &
    WorkshopProperties &
    UserProperties & {
      cancellation_reason?: string;
    };
}

export interface WorkshopVoucherAddedToCartEvent {
  event: 'workshop_voucher_added_to_cart';
  properties: BaseEventProperties & {
    voucher_amount: number;
    bonus_percent: number;
    total_value: number;
    currency: string;
    quantity: number;
  };
}

export interface WorkshopVoucherRemovedFromCartEvent {
  event: 'workshop_voucher_removed_from_cart';
  properties: BaseEventProperties & {
    voucher_amount: number;
    currency: string;
    quantity: number;
  };
}

export interface WorkshopUpsellViewedEvent {
  event: 'workshop_upsell_viewed';
  properties: BaseEventProperties & {
    bonus_percent: number;
    available_vouchers: number;
    current_stage: string;
  };
}

export interface WorkshopUpsellSkippedEvent {
  event: 'workshop_upsell_skipped';
  properties: BaseEventProperties & {
    bonus_percent: number;
  };
}
