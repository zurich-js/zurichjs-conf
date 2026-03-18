/**
 * User Engagement Analytics Events
 * Events related to user interactions and engagement
 */

import type { BaseEventProperties, ErrorProperties } from './base';

export interface ButtonClickedEvent {
  event: 'button_clicked';
  properties: BaseEventProperties & {
    button_text: string;
    button_id?: string;
    button_location: string;
    button_action: string;
    button_context?: Record<string, unknown>;
  };
}

export interface FormSubmittedEvent {
  event: 'form_submitted';
  properties: BaseEventProperties & {
    form_name: string;
    form_id?: string;
    form_type: 'contact' | 'checkout' | 'registration' | 'other';
    form_success: boolean;
  };
}

export interface FormErrorEvent {
  event: 'form_error';
  properties: BaseEventProperties &
    ErrorProperties & {
      form_name: string;
      form_field?: string;
    };
}

export interface LinkClickedEvent {
  event: 'link_clicked';
  properties: BaseEventProperties & {
    link_text: string;
    link_url: string;
    link_type: 'internal' | 'external';
    link_location: string;
  };
}

export interface SearchPerformedEvent {
  event: 'search_performed';
  properties: BaseEventProperties & {
    search_query: string;
    search_category?: string;
    results_count?: number;
  };
}

export interface FilterAppliedEvent {
  event: 'filter_applied';
  properties: BaseEventProperties & {
    filter_type: string;
    filter_value: string;
    filter_location: string;
  };
}

export interface ShareClickedEvent {
  event: 'share_clicked';
  properties: BaseEventProperties & {
    share_platform: 'twitter' | 'linkedin' | 'facebook' | 'email' | 'copy_link' | 'other';
    content_type: 'ticket' | 'workshop' | 'event' | 'other';
    content_id?: string;
  };
}

export interface NewsletterSubscribedEvent {
  event: 'newsletter_subscribed';
  properties: BaseEventProperties & {
    email: string;
    subscription_source: 'footer' | 'popup' | 'checkout' | 'other';
    subscription_success: boolean;
    error_message?: string;
  };
}
