/**
 * Hoodie Allocation
 * Pure functions deciding who gets a VIP hoodie. Strict by design:
 *   - program speakers
 *   - people who bought a VIP ticket (paid — not complimentary)
 *   - people who paid for a VIP upgrade (complimentary upgrades do not count)
 *   - the one exception: complimentary VIPs whose comp reason is "sponsor"
 * Nobody else. VIP ticket holders who miss the bar are listed separately with
 * the reason so the door team can explain it.
 */

import { APPAREL_SIZES } from '@/lib/types/ticket-constants';

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function sameName(
  a: { first_name: string; last_name: string },
  b: { first_name: string; last_name: string }
): boolean {
  const aFirst = normalizeName(a.first_name);
  if (aFirst && aFirst === normalizeName(b.first_name)) return true;
  return normalizeName(`${a.first_name} ${a.last_name}`) === normalizeName(`${b.first_name} ${b.last_name}`);
}

/** Sponsor comps are the one exception to "complimentary means no hoodie" */
export function isSponsorComp(reason: string | null | undefined): boolean {
  return reason?.trim().toLowerCase() === 'sponsor';
}

function mentionsSponsor(note: string | null | undefined): boolean {
  return /sponsor/i.test(note ?? '');
}

function emptyRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

/**
 * Why a confirmed VIP ticket does or does not earn a hoodie.
 * Upgraded tickets are judged by the upgrade's payment mode, never by the
 * ticket's own amount_paid (that is what they paid for the original tier).
 */
export function classifyVipTicket(
  ticket: HoodieTicketInput,
  upgradesById: Map<string, HoodieUpgradeInput>
): { eligible: true; reason: HoodieReason } | { eligible: false; exclusion: HoodieExclusion } {
  if (ticket.upgrade_id || ticket.upgraded_from) {
    const upgrade = ticket.upgrade_id ? upgradesById.get(ticket.upgrade_id) : undefined;
    if (!upgrade) return { eligible: false, exclusion: 'upgrade_record_missing' };
    if (upgrade.upgrade_mode === 'complimentary') {
      if (mentionsSponsor(upgrade.admin_note)) return { eligible: true, reason: 'sponsor_comp' };
      return { eligible: false, exclusion: 'complimentary_upgrade' };
    }
    return { eligible: true, reason: 'vip_upgrade_paid' };
  }

  if (ticket.payment_type === 'complimentary' || ticket.amount_paid <= 0) {
    if (isSponsorComp(ticket.complimentary_reason)) return { eligible: true, reason: 'sponsor_comp' };
    return { eligible: false, exclusion: 'complimentary_vip_ticket' };
  }
  return { eligible: true, reason: 'vip_ticket_paid' };
}

export function buildHoodieAllocation(input: {
  speakers: HoodieSpeakerInput[];
  tickets: HoodieTicketInput[];
  upgrades: HoodieUpgradeInput[];
}): HoodieAllocation {
  const upgradesById = new Map(input.upgrades.map((upgrade) => [upgrade.id, upgrade]));
  const eligible = new Map<string, HoodieEntry>();
  const excluded: HoodieExcludedEntry[] = [];

  // Speakers first — a speaker who also holds a VIP ticket is one hoodie, as a speaker
  for (const speaker of input.speakers) {
    const key = normalizeEmail(speaker.email);
    if (eligible.has(key)) continue;
    eligible.set(key, {
      key,
      first_name: speaker.first_name,
      last_name: speaker.last_name,
      email: key,
      reason: 'speaker',
      ticket_id: null,
      hoodie_size: speaker.hoodie_size,
      hoodie_handed_at: null,
    });
  }

  for (const ticket of input.tickets) {
    const email = normalizeEmail(ticket.email);
    const existing = eligible.get(email);

    if (existing?.reason === 'speaker') {
      // Same person: attach ticket details so size/handout show up
      existing.ticket_id ??= ticket.id;
      existing.hoodie_size ??= ticket.hoodie_size;
      existing.hoodie_handed_at ??= ticket.hoodie_handed_at;
      continue;
    }

    const verdict = classifyVipTicket(ticket, upgradesById);
    if (!verdict.eligible) {
      excluded.push({
        key: `ticket:${ticket.id}`,
        first_name: ticket.first_name,
        last_name: ticket.last_name,
        email,
        ticket_id: ticket.id,
        exclusion: verdict.exclusion,
        hoodie_size: ticket.hoodie_size,
      });
      continue;
    }

    // Two paid tickets under one email: same name = duplicate (one hoodie),
    // different name = someone bought for a partner (two hoodies)
    const key = existing && !sameName(existing, ticket) ? `ticket:${ticket.id}` : email;
    if (eligible.has(key)) continue;
    eligible.set(key, {
      key,
      first_name: ticket.first_name,
      last_name: ticket.last_name,
      email,
      reason: verdict.reason,
      ticket_id: ticket.id,
      hoodie_size: ticket.hoodie_size,
      hoodie_handed_at: ticket.hoodie_handed_at,
    });
  }

  const byName = (a: { first_name: string; last_name: string }, b: { first_name: string; last_name: string }) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
  const eligibleList = [...eligible.values()].sort(byName);
  excluded.sort(byName);

  const stats: HoodieStats = {
    eligible: eligibleList.length,
    by_reason: emptyRecord(HOODIE_REASONS),
    with_size: 0,
    missing_size: 0,
    handed: 0,
    not_handed: 0,
    size_counts: emptyRecord(APPAREL_SIZES),
    excluded: excluded.length,
    excluded_by_reason: emptyRecord(HOODIE_EXCLUSIONS),
  };

  for (const entry of eligibleList) {
    stats.by_reason[entry.reason] += 1;
    if (entry.hoodie_size) {
      stats.with_size += 1;
      stats.size_counts[entry.hoodie_size] = (stats.size_counts[entry.hoodie_size] ?? 0) + 1;
    } else {
      stats.missing_size += 1;
    }
    if (entry.hoodie_handed_at) stats.handed += 1;
    else stats.not_handed += 1;
  }
  for (const entry of excluded) {
    stats.excluded_by_reason[entry.exclusion] += 1;
  }

  return { eligible: eligibleList, excluded, stats };
}
