/**
 * Sponsorship & Partnership Analytics Events
 * Events related to sponsor and community partner interactions
 */

import type { BaseEventProperties } from './base';

export interface SponsorClickedEvent {
  event: 'sponsor_clicked';
  properties: BaseEventProperties & {
    sponsor_name: string;
    sponsor_url: string;
    sponsor_tier?: string;
  };
}

export interface CommunityPartnerClickedEvent {
  event: 'community_partner_clicked';
  properties: BaseEventProperties & {
    partner_name: string;
    partner_url: string;
  };
}

export interface SponsorQuoteViewedEvent {
  event: 'sponsor_quote_viewed';
  properties: BaseEventProperties & {
    company_name: string;
    option_count: number;
    currency: string;
  };
}
