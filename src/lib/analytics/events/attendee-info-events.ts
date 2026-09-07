/**
 * Attendee Info Analytics Events
 * Interactions on the /attendee-info page
 */

import type { BaseEventProperties } from './base';
import type { AttendeeAudience } from '@/data/attendee-info';

export interface AttendeeInfoAudienceChangedEvent {
  event: 'attendee_info_audience_changed';
  properties: BaseEventProperties & {
    audience: AttendeeAudience;
  };
}

export interface AttendeeInfoTocClickedEvent {
  event: 'attendee_info_toc_clicked';
  properties: BaseEventProperties & {
    section_id: string;
    section_label: string;
    toc_variant: 'sidebar' | 'inline';
    audience: AttendeeAudience;
  };
}

export interface AttendeeInfoQuicklinkClickedEvent {
  event: 'attendee_info_quicklink_clicked';
  properties: BaseEventProperties & {
    link_label: string;
    link_sublabel?: string;
    travel_time?: string;
    link_url: string;
    audience: AttendeeAudience;
  };
}
