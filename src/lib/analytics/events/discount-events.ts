/**
 * Discount Pop-up Analytics Events
 * Events related to the randomized discount popup system
 */

import type { BaseEventProperties } from './base';

export interface DiscountPopupShownEvent {
  event: 'discount_popup_shown';
  properties: BaseEventProperties & {
    discount_code: string;
    percent_off: number;
    expires_at: string;
    is_lottery: boolean;
    lottery_source?: string;
  };
}

export interface DiscountPopupDismissedEvent {
  event: 'discount_popup_dismissed';
  properties: BaseEventProperties & {
    discount_code: string;
    time_remaining_seconds: number;
  };
}

export interface DiscountCodeCopiedEvent {
  event: 'discount_code_copied';
  properties: BaseEventProperties & {
    discount_code: string;
    time_remaining_seconds: number;
  };
}

export interface DiscountWidgetClickedEvent {
  event: 'discount_widget_clicked';
  properties: BaseEventProperties & {
    discount_code: string;
    time_remaining_seconds: number;
  };
}

export interface DiscountExpiredEvent {
  event: 'discount_expired';
  properties: BaseEventProperties & {
    discount_code: string;
    was_copied: boolean;
  };
}

export interface DiscountEligibilityCheckedEvent {
  event: 'discount_eligibility_checked';
  properties: BaseEventProperties & {
    was_eligible: boolean;
    had_cooldown: boolean;
    was_force_shown: boolean;
  };
}
