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
    /** Whether the popup copy was personalized to the visitor's tech stack */
    personalized?: boolean;
    /** Detected framework used for personalization, e.g. 'react' */
    detected_stack?: string;
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

export interface DiscountEmailCapturedEvent {
  event: 'discount_email_captured';
  properties: BaseEventProperties & {
    discount_code: string;
    percent_off: number;
    email: string;
  };
}

/**
 * Fired once per popup mount. Since the show-probability roll and cooldown
 * cookie were removed, `was_eligible` is simply the inverse of
 * `is_known_ticket_holder` — every other visitor is offered the discount.
 * The old `had_cooldown` / `was_force_shown` properties no longer exist.
 */
export interface DiscountEligibilityCheckedEvent {
  event: 'discount_eligibility_checked';
  properties: BaseEventProperties & {
    was_eligible: boolean;
    /** Popup permanently suppressed because this browser bought a ticket */
    is_known_ticket_holder?: boolean;
    /** Running visit count for this browser (localStorage-based) */
    visit_count?: number;
  };
}
