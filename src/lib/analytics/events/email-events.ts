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
