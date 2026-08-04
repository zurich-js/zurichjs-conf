/**
 * Ticket Analytics Events
 * Events related to ticket viewing, cart, and purchase
 */

import type {
  BaseEventProperties,
  TicketProperties,
  PaymentProperties,
  RevenueProperties,
  UserProperties,
  CartProperties,
} from './base';

export interface TicketViewedEvent {
  event: 'ticket_viewed';
  properties: BaseEventProperties & TicketProperties;
}

export interface TicketAddedToCartEvent {
  event: 'ticket_added_to_cart';
  properties: BaseEventProperties &
    TicketProperties & {
      quantity: number;
    };
}

export interface TicketRemovedFromCartEvent {
  event: 'ticket_removed_from_cart';
  properties: BaseEventProperties &
    TicketProperties & {
      quantity: number;
      removal_location?: 'cart_review' | 'checkout_summary' | 'other';
    };
}

export interface CartQuantityUpdatedEvent {
  event: 'cart_quantity_updated';
  properties: BaseEventProperties &
    TicketProperties & {
      old_quantity: number;
      new_quantity: number;
      quantity?: number;
      ticket_type?: string;
      cart_total?: number;
    };
}

export interface CartCreatedEvent {
  event: 'cart_created';
  properties: BaseEventProperties & {
    /** Kind of the item that opened the cart */
    item_kind: 'ticket' | 'workshop';
    item_id: string;
    item_title: string;
    price: number;
    currency: string;
    quantity: number;
  };
}

export interface CartReviewedEvent {
  event: 'cart_reviewed';
  properties: BaseEventProperties & CartProperties;
}

export interface CartStepViewedEvent {
  event: 'cart_step_viewed';
  properties: BaseEventProperties & {
    step: 'review' | 'attendees' | 'checkout' | 'payment';
    cart_item_count: number;
    cart_total_amount: number;
    cart_currency?: string;
    cart_items?: CartProperties['cart_items'];
    ticket_count?: number;
    workshop_count?: number;
    seat_count?: number;
    has_attendee_step?: boolean;
    has_discount?: boolean;
    coupon_code?: string;
    purchase_type?: 'ticket' | 'workshop' | 'mixed';
  };
}

export interface TicketPurchasedEvent {
  event: 'ticket_purchased';
  properties: BaseEventProperties &
    TicketProperties &
    PaymentProperties &
    RevenueProperties &
    UserProperties & {
      attendee_count: number;
      attendee_names?: string[];
    };
}

export interface TicketTransferredEvent {
  event: 'ticket_transferred';
  properties: BaseEventProperties & {
    ticket_id: string;
    from_email: string;
    to_email: string;
    transferred_at: string;
  };
}

export interface TicketValidatedEvent {
  event: 'ticket_validated';
  properties: BaseEventProperties & {
    ticket_id: string;
    validated_by?: string;
    validation_status: 'success' | 'failed' | 'already_used';
  };
}

export interface TicketCheckedInEvent {
  event: 'ticket_checked_in';
  properties: BaseEventProperties & {
    ticket_id: string;
    checked_in_at: string;
    checked_in_by?: string;
  };
}

/**
 * What the clicked ticket CTA actually does. Three very different actions used
 * to be reported identically, so funnels treated them as one intent:
 * - `add_to_cart` — the only path that can reach checkout in this session
 * - `student_verification` — opens the verification modal; the visitor cannot
 *   buy until they're verified, so they never continue the funnel today
 * - `waitlist` — sold-out tier, opens a "get notified" form; can never convert
 *
 * Filter to `add_to_cart` before reading any click→checkout conversion rate.
 */
export type TicketCtaIntent = 'add_to_cart' | 'student_verification' | 'waitlist';

export interface TicketButtonClickedEvent {
  event: 'ticket_button_clicked';
  properties: BaseEventProperties &
    TicketProperties & {
      button_location: 'price_card' | 'tickets_section' | 'other';
      ticket_type: string;
      is_sold_out?: boolean;
      cta_intent?: TicketCtaIntent;
    };
}
