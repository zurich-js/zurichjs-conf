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
    /** Why the offer was sweetened — currently only 'recurring_visitor' */
    price_sensitivity_reason?: string;
    /** Visit number this popup was shown on */
    visit_count?: number;
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
 * Fired once per popup mount, before any delay. Records why a visitor was or
 * wasn't offered a discount, and which visit this is — the counterpart to
 * `visit_count` on checkout_completed, so you can compare visits-to-purchase
 * for visitors who saw the offer against those who didn't.
 */
export interface DiscountEligibilityCheckedEvent {
  event: 'discount_eligibility_checked';
  properties: BaseEventProperties & {
    was_eligible: boolean;
    /** Popup permanently suppressed because this browser bought a ticket */
    is_known_ticket_holder?: boolean;
    /** Popup permanently suppressed via an admin-issued corporate access link */
    is_corporate_buyer?: boolean;
    /** 3rd+ visit without a purchase — qualifies for the sweetened offer */
    is_recurring_visitor?: boolean;
    /** Running visit count for this browser (localStorage-based) */
    visit_count?: number;
  };
}
