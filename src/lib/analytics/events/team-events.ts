/**
 * Team Detection Analytics Events
 * Events related to work email detection and team conversion nudges
 */

import type { BaseEventProperties } from './base';

export interface WorkEmailDetectedEvent {
  event: 'work_email_detected';
  properties: BaseEventProperties & {
    domain: string;
    colleague_count: number;
    company_name?: string;
  };
}

export interface ColleagueBannerShownEvent {
  event: 'colleague_banner_shown';
  properties: BaseEventProperties & {
    domain: string;
    colleague_count: number;
    company_name?: string;
  };
}

export interface ColleagueBannerClickedEvent {
  event: 'colleague_banner_clicked';
  properties: BaseEventProperties & {
    domain: string;
    colleague_count: number;
    company_name?: string;
  };
}
