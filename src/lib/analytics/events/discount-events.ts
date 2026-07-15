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
    /** Experiment variant ('control' | 'aggressive-20' | 'price-sensitive-30'); absent when not enrolled */
    experiment_variant?: string;
    /** True when PostHog assigned price-sensitive-30 to an ineligible visitor (served control instead) */
    variant_downgraded?: boolean;
    /** Why the visitor qualified for price-sensitive-30 ('low_income_country' = lower-income European country | 'recurring_visitor') */
    price_sensitivity_reason?: string;
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
    experiment_variant?: string;
  };
}

export interface DiscountCodeCopiedEvent {
  event: 'discount_code_copied';
  properties: BaseEventProperties & {
    discount_code: string;
    time_remaining_seconds: number;
    experiment_variant?: string;
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
    experiment_variant?: string;
  };
}

export interface DiscountEligibilityCheckedEvent {
  event: 'discount_eligibility_checked';
  properties: BaseEventProperties & {
    was_eligible: boolean;
    had_cooldown: boolean;
    was_force_shown: boolean;
    /** Popup permanently suppressed because this browser bought a ticket */
    is_known_ticket_holder?: boolean;
    /** Running visit count for this browser (localStorage-based) */
    visit_count?: number;
  };
}
