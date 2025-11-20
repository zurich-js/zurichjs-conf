/**
 * PostHog Analytics Events
 *
 * This file defines all analytics events used throughout the application.
 * All events are type-safe and centralized for easy management and evolution.
 *
 * Event Naming Convention:
 * - Use snake_case for event names
 * - Follow pattern: {noun}_{verb} (e.g., "ticket_purchased", "checkout_started")
 * - Be specific and descriptive
 */

import type { TicketCategory, TicketStage } from '@/lib/types/database'

// ============================================================================
// Event Properties Types
// ============================================================================

/**
 * Base properties included in all events
 */
export interface BaseEventProperties {
  timestamp?: number
  page_url?: string
  page_title?: string
  user_agent?: string
  referrer?: string
}

/**
 * User identification properties
 */
export interface UserProperties {
  email?: string
  name?: string
  first_name?: string
  last_name?: string
  company?: string
  job_title?: string
  user_id?: string
}

/**
 * Ticket-related properties
 */
export interface TicketProperties {
  ticket_id?: string
  ticket_category: TicketCategory
  ticket_stage: TicketStage
  ticket_price: number
  currency: string
  ticket_count: number
}

/**
 * Workshop-related properties
 */
export interface WorkshopProperties {
  workshop_id: string
  workshop_title: string
  workshop_instructor?: string
  workshop_capacity?: number
  workshop_date?: string
}

/**
 * Payment-related properties
 */
export interface PaymentProperties {
  payment_intent_id?: string
  payment_method?: string
  payment_status: 'succeeded' | 'failed' | 'pending' | 'cancelled'
  stripe_session_id?: string
  stripe_customer_id?: string
}

/**
 * Revenue properties (for revenue analytics)
 */
export interface RevenueProperties {
  /** Total amount in smallest currency unit (e.g., cents) */
  revenue_amount: number
  /** ISO 4217 currency code */
  revenue_currency: string
  /** Revenue type for categorization */
  revenue_type: 'ticket' | 'workshop' | 'voucher' | 'other'
  /** Optional transaction ID */
  transaction_id?: string
  /** Optional product details */
  product_name?: string
  product_category?: string
}

/**
 * Cart-related properties
 */
export interface CartProperties {
  cart_item_count: number
  cart_total_amount: number
  cart_currency: string
  cart_items: Array<{
    type: 'ticket' | 'workshop_voucher'
    category?: TicketCategory
    stage?: TicketStage
    quantity: number
    price: number
  }>
}

/**
 * Error properties
 */
export interface ErrorProperties {
  error_message: string
  error_code?: string
  error_stack?: string
  error_type: 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'
  error_severity: 'low' | 'medium' | 'high' | 'critical'
  error_context?: Record<string, unknown>
}

// ============================================================================
// Event Definitions (Discriminated Union)
// ============================================================================

/**
 * Page view event
 */
export interface PageViewedEvent {
  event: 'page_viewed'
  properties: BaseEventProperties & {
    page_name: string
    page_path: string
    page_category?: 'landing' | 'tickets' | 'workshops' | 'checkout' | 'admin' | 'other'
  }
}

/**
 * User identification event
 */
export interface UserIdentifiedEvent {
  event: 'user_identified'
  properties: BaseEventProperties & UserProperties
}

// ----------------------------------------------------------------------------
// Ticket Events
// ----------------------------------------------------------------------------

export interface TicketViewedEvent {
  event: 'ticket_viewed'
  properties: BaseEventProperties & TicketProperties
}

export interface TicketAddedToCartEvent {
  event: 'ticket_added_to_cart'
  properties: BaseEventProperties & TicketProperties & {
    quantity: number
  }
}

export interface TicketRemovedFromCartEvent {
  event: 'ticket_removed_from_cart'
  properties: BaseEventProperties & TicketProperties & {
    quantity: number
    removal_location?: 'cart_review' | 'checkout_summary' | 'other'
  }
}

export interface CartQuantityUpdatedEvent {
  event: 'cart_quantity_updated'
  properties: BaseEventProperties & TicketProperties & {
    old_quantity: number
    new_quantity: number
  }
}

export interface CartReviewedEvent {
  event: 'cart_reviewed'
  properties: BaseEventProperties & CartProperties
}

export interface CartStepViewedEvent {
  event: 'cart_step_viewed'
  properties: BaseEventProperties & {
    step: 'review' | 'attendees' | 'upsells' | 'checkout'
    cart_item_count: number
    cart_total_amount: number
  }
}

export interface TicketPurchasedEvent {
  event: 'ticket_purchased'
  properties: BaseEventProperties &
    TicketProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      attendee_count: number
      attendee_names?: string[]
    }
}

export interface TicketTransferredEvent {
  event: 'ticket_transferred'
  properties: BaseEventProperties & {
    ticket_id: string
    from_email: string
    to_email: string
    transferred_at: string
  }
}

export interface TicketValidatedEvent {
  event: 'ticket_validated'
  properties: BaseEventProperties & {
    ticket_id: string
    validated_by?: string
    validation_status: 'success' | 'failed' | 'already_used'
  }
}

export interface TicketCheckedInEvent {
  event: 'ticket_checked_in'
  properties: BaseEventProperties & {
    ticket_id: string
    checked_in_at: string
    checked_in_by?: string
  }
}

// ----------------------------------------------------------------------------
// Workshop Events
// ----------------------------------------------------------------------------

export interface WorkshopViewedEvent {
  event: 'workshop_viewed'
  properties: BaseEventProperties & WorkshopProperties
}

export interface WorkshopVoucherPurchasedEvent {
  event: 'workshop_voucher_purchased'
  properties: BaseEventProperties &
    WorkshopProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      voucher_code?: string
      voucher_count: number
    }
}

export interface WorkshopRegisteredEvent {
  event: 'workshop_registered'
  properties: BaseEventProperties &
    WorkshopProperties &
    UserProperties & {
      voucher_code?: string
      registration_status: 'confirmed' | 'waitlist'
    }
}

export interface WorkshopCancelledEvent {
  event: 'workshop_cancelled'
  properties: BaseEventProperties &
    WorkshopProperties &
    UserProperties & {
      cancellation_reason?: string
    }
}

export interface WorkshopVoucherAddedToCartEvent {
  event: 'workshop_voucher_added_to_cart'
  properties: BaseEventProperties & {
    voucher_amount: number
    bonus_percent: number
    total_value: number
    currency: string
    quantity: number
  }
}

export interface WorkshopVoucherRemovedFromCartEvent {
  event: 'workshop_voucher_removed_from_cart'
  properties: BaseEventProperties & {
    voucher_amount: number
    currency: string
    quantity: number
  }
}

export interface WorkshopUpsellViewedEvent {
  event: 'workshop_upsell_viewed'
  properties: BaseEventProperties & {
    bonus_percent: number
    available_vouchers: number
    current_stage: string
  }
}

export interface WorkshopUpsellSkippedEvent {
  event: 'workshop_upsell_skipped'
  properties: BaseEventProperties & {
    bonus_percent: number
  }
}

// ----------------------------------------------------------------------------
// Checkout & Payment Events
// ----------------------------------------------------------------------------

export interface CheckoutStartedEvent {
  event: 'checkout_started'
  properties: BaseEventProperties & CartProperties & UserProperties
}

export interface CheckoutCompletedEvent {
  event: 'checkout_completed'
  properties: BaseEventProperties &
    CartProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      checkout_duration_seconds?: number
    }
}

export interface CheckoutAbandonedEvent {
  event: 'checkout_abandoned'
  properties: BaseEventProperties &
    CartProperties &
    UserProperties & {
      abandonment_stage: 'cart' | 'customer_info' | 'payment'
      time_spent_seconds?: number
    }
}

export interface CheckoutFormFieldFocusedEvent {
  event: 'checkout_form_field_focused'
  properties: BaseEventProperties & {
    field_name: string
    field_type: string
  }
}

export interface VoucherAppliedEvent {
  event: 'voucher_applied'
  properties: BaseEventProperties & {
    voucher_code: string
    discount_amount: number
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    success: boolean
    error_message?: string
  }
}

export interface VoucherRemovedEvent {
  event: 'voucher_removed'
  properties: BaseEventProperties & {
    voucher_code: string
    discount_amount: number
  }
}

export interface PaymentSucceededEvent {
  event: 'payment_succeeded'
  properties: BaseEventProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      payment_duration_seconds?: number
    }
}

export interface PaymentFailedEvent {
  event: 'payment_failed'
  properties: BaseEventProperties &
    PaymentProperties &
    UserProperties &
    ErrorProperties
}

// ----------------------------------------------------------------------------
// User Engagement Events
// ----------------------------------------------------------------------------

export interface ButtonClickedEvent {
  event: 'button_clicked'
  properties: BaseEventProperties & {
    button_text: string
    button_id?: string
    button_location: string
    button_action: string
    button_context?: Record<string, unknown>
  }
}

export interface TicketButtonClickedEvent {
  event: 'ticket_button_clicked'
  properties: BaseEventProperties & TicketProperties & {
    button_location: 'price_card' | 'tickets_section' | 'other'
    ticket_type: string
    is_sold_out?: boolean
  }
}

export interface FormSubmittedEvent {
  event: 'form_submitted'
  properties: BaseEventProperties & {
    form_name: string
    form_id?: string
    form_type: 'contact' | 'checkout' | 'registration' | 'other'
    form_success: boolean
  }
}

export interface FormErrorEvent {
  event: 'form_error'
  properties: BaseEventProperties &
    ErrorProperties & {
      form_name: string
      form_field?: string
    }
}

export interface LinkClickedEvent {
  event: 'link_clicked'
  properties: BaseEventProperties & {
    link_text: string
    link_url: string
    link_type: 'internal' | 'external'
    link_location: string
  }
}

// ----------------------------------------------------------------------------
// Feature Usage Events
// ----------------------------------------------------------------------------

export interface SearchPerformedEvent {
  event: 'search_performed'
  properties: BaseEventProperties & {
    search_query: string
    search_category?: string
    results_count?: number
  }
}

export interface FilterAppliedEvent {
  event: 'filter_applied'
  properties: BaseEventProperties & {
    filter_type: string
    filter_value: string
    filter_location: string
  }
}

export interface ShareClickedEvent {
  event: 'share_clicked'
  properties: BaseEventProperties & {
    share_platform: 'twitter' | 'linkedin' | 'facebook' | 'email' | 'copy_link' | 'other'
    content_type: 'ticket' | 'workshop' | 'event' | 'other'
    content_id?: string
  }
}

// ----------------------------------------------------------------------------
// Error & System Events
// ----------------------------------------------------------------------------

export interface ErrorOccurredEvent {
  event: 'error_occurred'
  properties: BaseEventProperties & ErrorProperties
}

export interface ApiErrorEvent {
  event: 'api_error'
  properties: BaseEventProperties &
    ErrorProperties & {
      api_endpoint: string
      api_method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
      api_status_code?: number
      api_response_time_ms?: number
    }
}

export interface WebhookReceivedEvent {
  event: 'webhook_received'
  properties: BaseEventProperties & {
    webhook_source: 'stripe' | 'other'
    webhook_event_type: string
    webhook_id?: string
    webhook_processing_time_ms?: number
    webhook_success: boolean
  }
}

// ============================================================================
// Union Type of All Events
// ============================================================================

/**
 * Union of all possible analytics events.
 * This provides full type safety when tracking events.
 */
export type AnalyticsEvent =
  | PageViewedEvent
  | UserIdentifiedEvent
  | TicketViewedEvent
  | TicketAddedToCartEvent
  | TicketRemovedFromCartEvent
  | TicketPurchasedEvent
  | TicketTransferredEvent
  | TicketValidatedEvent
  | TicketCheckedInEvent
  | TicketButtonClickedEvent
  | CartQuantityUpdatedEvent
  | CartReviewedEvent
  | CartStepViewedEvent
  | WorkshopViewedEvent
  | WorkshopVoucherPurchasedEvent
  | WorkshopRegisteredEvent
  | WorkshopCancelledEvent
  | WorkshopVoucherAddedToCartEvent
  | WorkshopVoucherRemovedFromCartEvent
  | WorkshopUpsellViewedEvent
  | WorkshopUpsellSkippedEvent
  | CheckoutStartedEvent
  | CheckoutCompletedEvent
  | CheckoutAbandonedEvent
  | CheckoutFormFieldFocusedEvent
  | VoucherAppliedEvent
  | VoucherRemovedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | ButtonClickedEvent
  | FormSubmittedEvent
  | FormErrorEvent
  | LinkClickedEvent
  | SearchPerformedEvent
  | FilterAppliedEvent
  | ShareClickedEvent
  | ErrorOccurredEvent
  | ApiErrorEvent
  | WebhookReceivedEvent

/**
 * Extract event name from AnalyticsEvent
 */
export type EventName = AnalyticsEvent['event']

/**
 * Extract properties for a specific event
 */
export type EventProperties<T extends EventName> = Extract<
  AnalyticsEvent,
  { event: T }
>['properties']
