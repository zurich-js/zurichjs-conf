/**
 * After Party Types
 * Contracts shared by the roster logic (src/lib/after-party), the admin API
 * route (/api/admin/after-party), and the admin UI.
 */

export const AFTER_PARTY_SOURCES = ['speaker', 'speaker_plus_one', 'activity_guest', 'vip_ticket'] as const;
export type AfterPartySource = (typeof AFTER_PARTY_SOURCES)[number];

export const AFTER_PARTY_SOURCE_LABELS: Record<AfterPartySource, string> = {
  speaker: 'Speaker',
  speaker_plus_one: 'Speaker plus one',
  activity_guest: 'Additional guest',
  vip_ticket: 'VIP ticket',
};

export interface AfterPartySpeakerInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  /** null when the speaker has not submitted their logistics form yet */
  attending_after_party: boolean | null;
  after_party_plus_one: boolean | null;
  after_party_plus_one_first_name: string | null;
  after_party_plus_one_last_name: string | null;
  after_party_plus_one_email: string | null;
  dietary_restrictions: string | null;
}

export interface AfterPartyGuestInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  guest_type: string;
  related_speaker_name: string | null;
  dietary_restrictions: string | null;
  admin_notes: string | null;
}

export interface AfterPartyTicketInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  amount_paid: number;
  /** metadata.paymentType === 'complimentary' for manually issued comps */
  payment_type: string | null;
  checked_in: boolean;
}

export interface AfterPartyTicketSummary {
  id: string;
  company: string | null;
  complimentary: boolean;
  checked_in: boolean;
}

export interface AfterPartyAttendee {
  /** Stable key — normalized email when available */
  key: string;
  first_name: string;
  last_name: string;
  email: string | null;
  /** How they got on the list, in priority order (first = primary) */
  sources: AfterPartySource[];
  primary_source: AfterPartySource;
  /** For plus ones: the speaker bringing them */
  related_speaker_name: string | null;
  /** For admin-added guests: volunteer / complimentary / paid / speaker_plus_one */
  guest_type: string | null;
  /** Confirmed VIP ticket held by this person, if any */
  ticket: AfterPartyTicketSummary | null;
  /** Speaker-declared plus one who has no VIP ticket issued yet */
  needs_vip_ticket: boolean;
  /** VIP ticket holder who is a speaker that declined the after party */
  speaker_declined: boolean;
  dietary_restrictions: string | null;
  notes: string | null;
}

export interface AfterPartyStats {
  capacity: number;
  /** Unique people expected */
  headcount: number;
  /** capacity - headcount; negative when over */
  remaining: number;
  over_capacity: boolean;
  over_by: number;
  /** Headcount by primary source — sums to headcount */
  by_source: Record<AfterPartySource, number>;
  /** All confirmed VIP tickets, including those merged into another source */
  vip_tickets_total: number;
  vip_tickets_complimentary: number;
  /** VIP tickets held by someone already listed as a speaker, plus one, or guest */
  vip_tickets_merged: number;
  /** Speaker plus ones still waiting for their VIP ticket */
  plus_ones_needing_ticket: number;
  /** Program speakers who have not answered and are not on the list another way */
  speakers_unanswered: number;
  speakers_declined: number;
  /** headcount + unanswered speakers — the worst case if every pending speaker says yes */
  potential_headcount: number;
}

export interface AfterPartyRoster {
  attendees: AfterPartyAttendee[];
  stats: AfterPartyStats;
}

/** GET /api/admin/after-party */
export interface AfterPartyOverviewResponse extends AfterPartyRoster {
  /** Server time the roster was computed, for the "as of" label */
  generated_at: string;
}
