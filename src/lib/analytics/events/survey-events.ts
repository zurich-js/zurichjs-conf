/**
 * Exit-Intent Survey Analytics Events
 * Events related to the exit-intent survey shown during checkout abandonment
 */

import type { BaseEventProperties } from './base';

export interface ExitSurveyShownEvent {
  event: 'exit_survey_shown';
  properties: BaseEventProperties & {
    cart_total: number;
    cart_currency: string;
    cart_items_count: number;
    checkout_step: string;
    time_on_page_seconds: number;
  };
}

export interface ExitSurveyResponseEvent {
  event: 'exit_survey_response';
  properties: BaseEventProperties & {
    reason: 'too_expensive' | 'not_ready' | 'comparing' | 'missing_info' | 'other';
    reason_detail?: string;
    cart_total: number;
    cart_currency: string;
    cart_items_count: number;
    checkout_step: string;
  };
}

export interface ExitSurveyCtaClickedEvent {
  event: 'exit_survey_cta_clicked';
  properties: BaseEventProperties & {
    reason: string;
    response_shown: string;
    cart_total: number;
    cart_currency: string;
  };
}

export interface ExitSurveyDismissedEvent {
  event: 'exit_survey_dismissed';
  properties: BaseEventProperties & {
    checkout_step: string;
    time_shown_seconds: number;
  };
}
