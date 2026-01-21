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
    };
}

export interface CartReviewedEvent {
  event: 'cart_reviewed';
  properties: BaseEventProperties & CartProperties;
}

export interface CartStepViewedEvent {
  event: 'cart_step_viewed';
  properties: BaseEventProperties & {
    step: 'review' | 'attendees' | 'upsells' | 'checkout';
    cart_item_count: number;
    cart_total_amount: number;
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

export interface TicketButtonClickedEvent {
  event: 'ticket_button_clicked';
  properties: BaseEventProperties &
    TicketProperties & {
      button_location: 'price_card' | 'tickets_section' | 'other';
      ticket_type: string;
      is_sold_out?: boolean;
    };
}
