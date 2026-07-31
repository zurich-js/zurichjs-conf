/**
 * Workshop Analytics Events
 * Events related to workshop viewing and registration
 */

import type {
  BaseEventProperties,
  WorkshopProperties,
  UserProperties,
} from './base';

export interface WorkshopViewedEvent {
  event: 'workshop_viewed';
  properties: BaseEventProperties & WorkshopProperties;
}

export interface WorkshopRegisteredEvent {
  event: 'workshop_registered';
  properties: BaseEventProperties &
    WorkshopProperties &
    UserProperties & {
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

export interface WorkshopAddedToCartEvent {
  event: 'workshop_added_to_cart';
  properties: BaseEventProperties & {
    workshop_id?: string;
    workshop_title?: string;
    workshop_amount: number;
    currency: string;
    quantity: number;
  };
}

export interface WorkshopRemovedFromCartEvent {
  event: 'workshop_removed_from_cart';
  properties: BaseEventProperties & {
    workshop_id?: string;
    workshop_title?: string;
    workshop_amount: number;
    currency: string;
    quantity: number;
    removal_location?: 'cart_review' | 'checkout_summary' | 'other';
  };
}
