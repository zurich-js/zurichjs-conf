/**
 * Email & Marketing Analytics Events
 * Events related to email campaigns and cart recovery
 */

import type { BaseEventProperties, CartProperties, UserProperties } from './base';

export interface CartAbandonmentEmailScheduledEvent {
  event: 'cart_abandonment_email_scheduled';
  properties: BaseEventProperties &
    CartProperties &
    UserProperties & {
      email_id?: string;
      scheduled_for: string;
      cart_recovery_url: string;
      /** Number of scheduled touches in this recovery sequence */
      touch_count?: number;
    };
}

export interface CartRecoveryClickedEvent {
  event: 'cart_recovery_clicked';
  properties: BaseEventProperties &
    CartProperties & {
      utm_source: string;
      utm_medium: string;
      utm_campaign: string;
    };
}

/** Shared cart context for the save-cart funnel events below */
interface CartSaveContextProperties {
  ticket_count?: number;
  workshop_count?: number;
  seat_count?: number;
  has_discount?: boolean;
  coupon_code?: string;
  purchase_type?: 'ticket' | 'workshop' | 'mixed';
}

export interface CartSaveOpenedEvent {
  event: 'cart_save_opened';
  properties: BaseEventProperties & CartProperties & CartSaveContextProperties;
}

export interface CartSavedEvent {
  event: 'cart_saved';
  properties: BaseEventProperties &
    CartProperties &
    UserProperties &
    CartSaveContextProperties & {
      email: string;
      /** Resend id of the first recovery email in the scheduled sequence */
      email_id?: string;
      scheduled_for?: string;
    };
}

export interface CartSaveFailedEvent {
  event: 'cart_save_failed';
  properties: BaseEventProperties &
    CartProperties &
    CartSaveContextProperties & {
      email: string;
      error_message?: string;
    };
}
