/**
 * Checkout & Payment Analytics Events
 * Events related to checkout flow and payments
 */

import type {
  BaseEventProperties,
  CartProperties,
  PaymentProperties,
  RevenueProperties,
  UserProperties,
  ErrorProperties,
} from './base';

export interface CheckoutStartedEvent {
  event: 'checkout_started';
  properties: BaseEventProperties & CartProperties & UserProperties;
}

export interface CheckoutCompletedEvent {
  event: 'checkout_completed';
  properties: BaseEventProperties &
    CartProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      checkout_duration_seconds?: number;
    };
}

export interface CheckoutAbandonedEvent {
  event: 'checkout_abandoned';
  properties: BaseEventProperties &
    CartProperties &
    UserProperties & {
      abandonment_stage: 'review' | 'attendees' | 'upsells' | 'checkout';
      time_spent_seconds?: number;
      fields_completed?: string[];
      fields_touched?: string[];
      form_completion_percent?: number;
      last_field_interacted?: string;
    };
}

export interface CheckoutFormFieldFocusedEvent {
  event: 'checkout_form_field_focused';
  properties: BaseEventProperties & {
    field_name: string;
    field_type: string;
    step: 'review' | 'attendees' | 'upsells' | 'checkout';
  };
}

export interface CheckoutFormFieldBlurredEvent {
  event: 'checkout_form_field_blurred';
  properties: BaseEventProperties & {
    field_name: string;
    field_type: string;
    field_filled: boolean;
    time_spent_seconds?: number;
    step: 'review' | 'attendees' | 'upsells' | 'checkout';
  };
}

export interface CheckoutFormFieldCompletedEvent {
  event: 'checkout_form_field_completed';
  properties: BaseEventProperties & {
    field_name: string;
    field_type: string;
    step: 'review' | 'attendees' | 'upsells' | 'checkout';
  };
}

export interface CheckoutEmailCapturedEvent {
  event: 'checkout_email_captured';
  properties: BaseEventProperties &
    CartProperties & {
      email: string;
      step: 'review' | 'attendees' | 'upsells' | 'checkout';
      time_to_email_seconds?: number;
    };
}

export interface VoucherAppliedEvent {
  event: 'voucher_applied';
  properties: BaseEventProperties & {
    voucher_code: string;
    discount_amount: number;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    success: boolean;
    error_message?: string;
  };
}

export interface VoucherRemovedEvent {
  event: 'voucher_removed';
  properties: BaseEventProperties & {
    voucher_code: string;
    discount_amount: number;
  };
}

export interface PaymentSucceededEvent {
  event: 'payment_succeeded';
  properties: BaseEventProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      payment_duration_seconds?: number;
    };
}

export interface PaymentFailedEvent {
  event: 'payment_failed';
  properties: BaseEventProperties & PaymentProperties & UserProperties & ErrorProperties;
}
