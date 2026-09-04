/**
 * Hoodie Allocation Types
 * Contracts shared by the allocation logic (src/lib/hoodies), the admin API
 * route (/api/admin/hoodies), and the admin UI.
 */

export const HOODIE_REASONS = ['speaker', 'vip_ticket_paid', 'vip_upgrade_paid', 'sponsor_comp'] as const;
export type HoodieReason = (typeof HOODIE_REASONS)[number];

export const HOODIE_REASON_LABELS: Record<HoodieReason, string> = {
  speaker: 'Speaker',
  vip_ticket_paid: 'Bought VIP ticket',
  vip_upgrade_paid: 'Paid VIP upgrade',
  sponsor_comp: 'Sponsor (comp VIP)',
};

export const HOODIE_EXCLUSIONS = [
  'complimentary_vip_ticket',
  'complimentary_upgrade',
  'upgrade_record_missing',
] as const;
export type HoodieExclusion = (typeof HOODIE_EXCLUSIONS)[number];

export const HOODIE_EXCLUSION_LABELS: Record<HoodieExclusion, string> = {
  complimentary_vip_ticket: 'Complimentary VIP ticket',
  complimentary_upgrade: 'Complimentary VIP upgrade',
  upgrade_record_missing: 'Upgraded, but no upgrade record found',
};

export interface HoodieSpeakerInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  hoodie_size: string | null;
}

export interface HoodieTicketInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  amount_paid: number;
  /** metadata.paymentType — 'complimentary' for manually issued comps */
  payment_type: string | null;
  /** metadata.complimentaryReason — 'sponsor' comps still get a hoodie */
  complimentary_reason: string | null;
  /** metadata.upgrade_id — set on every ticket that reached VIP via an upgrade */
  upgrade_id: string | null;
  /** metadata.upgraded_from — legacy marker for upgraded tickets */
  upgraded_from: string | null;
  hoodie_size: string | null;
  hoodie_handed_at: string | null;
}

export interface HoodieUpgradeInput {
  id: string;
  upgrade_mode: string;
  status: string;
  /** Free-text note; a complimentary upgrade for a sponsor is recognised from it */
  admin_note: string | null;
}

export interface HoodieEntry {
  key: string;
  first_name: string;
  last_name: string;
  email: string;
  reason: HoodieReason;
  /** Also holds a VIP ticket (speakers) — purely informational */
  ticket_id: string | null;
  hoodie_size: string | null;
  hoodie_handed_at: string | null;
}

export interface HoodieExcludedEntry {
  key: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_id: string;
  exclusion: HoodieExclusion;
  hoodie_size: string | null;
}

export interface HoodieStats {
  /** Hoodies to hand out — one per eligible person */
  eligible: number;
  by_reason: Record<HoodieReason, number>;
  with_size: number;
  missing_size: number;
  handed: number;
  not_handed: number;
  /** Per-size totals for eligible people who gave a size */
  size_counts: Record<string, number>;
  excluded: number;
  excluded_by_reason: Record<HoodieExclusion, number>;
}

export interface HoodieAllocation {
  eligible: HoodieEntry[];
  excluded: HoodieExcludedEntry[];
  stats: HoodieStats;
}

/** GET /api/admin/hoodies */
export interface HoodieAllocationResponse extends HoodieAllocation {
  generated_at: string;
}
