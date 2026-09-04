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
import {
  HOODIE_EXCLUSIONS,
  HOODIE_REASONS,
  type HoodieAllocation,
  type HoodieEntry,
  type HoodieExcludedEntry,
  type HoodieExclusion,
  type HoodieReason,
  type HoodieSpeakerInput,
  type HoodieStats,
  type HoodieTicketInput,
  type HoodieUpgradeInput,
} from '@/lib/types/hoodies';

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
  // The sponsor exception wins however the ticket became VIP: issued as a
  // comp VIP directly, or issued as a comp lower tier and upgraded later.
  if (isSponsorComp(ticket.complimentary_reason)) return { eligible: true, reason: 'sponsor_comp' };

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
