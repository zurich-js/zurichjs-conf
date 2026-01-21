/**
 * System Analytics Events
 * Events related to errors, API calls, and webhooks
 */

import type { BaseEventProperties, ErrorProperties } from './base';

export interface ErrorOccurredEvent {
  event: 'error_occurred';
  properties: BaseEventProperties & ErrorProperties;
}

export interface ApiErrorEvent {
  event: 'api_error';
  properties: BaseEventProperties &
    ErrorProperties & {
      api_endpoint: string;
      api_method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      api_status_code?: number;
      api_response_time_ms?: number;
    };
}

export interface WebhookReceivedEvent {
  event: 'webhook_received';
  properties: BaseEventProperties & {
    webhook_source: 'stripe' | 'other';
    webhook_event_type: string;
    webhook_id?: string;
    webhook_processing_time_ms?: number;
    webhook_success: boolean;
  };
}
