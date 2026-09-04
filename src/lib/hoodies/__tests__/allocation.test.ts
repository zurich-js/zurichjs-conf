import { describe, it, expect } from 'vitest';
import {
  buildHoodieAllocation,
  classifyVipTicket,
  type HoodieSpeakerInput,
  type HoodieTicketInput,
  type HoodieUpgradeInput,
} from '../allocation';

function speaker(overrides: Partial<HoodieSpeakerInput> = {}): HoodieSpeakerInput {
  return { id: 'spk-1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', hoodie_size: 'M', ...overrides };
}

function ticket(overrides: Partial<HoodieTicketInput> = {}): HoodieTicketInput {
  return {
    id: 'tkt-1',
    first_name: 'Grace',
    last_name: 'Hopper',
    email: 'grace@example.com',
    amount_paid: 45000,
    payment_type: null,
    upgrade_id: null,
    upgraded_from: null,
    hoodie_size: 'L',
    hoodie_handed_at: null,
    ...overrides,
  };
}

function upgrade(overrides: Partial<HoodieUpgradeInput> = {}): HoodieUpgradeInput {
  return { id: 'upg-1', upgrade_mode: 'stripe', status: 'completed', ...overrides };
}

describe('classifyVipTicket', () => {
  const none = new Map<string, HoodieUpgradeInput>();

  it('a paid VIP ticket is eligible', () => {
    expect(classifyVipTicket(ticket(), none)).toEqual({ eligible: true, reason: 'vip_ticket_paid' });
  });

  it('a complimentary VIP ticket (metadata) is not', () => {
    expect(classifyVipTicket(ticket({ amount_paid: 0, payment_type: 'complimentary' }), none)).toEqual({
      eligible: false,
      exclusion: 'complimentary_vip_ticket',
    });
  });

  it('a VIP ticket nothing was paid for is treated as complimentary', () => {
    expect(classifyVipTicket(ticket({ amount_paid: 0 }), none)).toEqual({
      eligible: false,
      exclusion: 'complimentary_vip_ticket',
    });
  });

  it('a paid upgrade (stripe or bank transfer) is eligible', () => {
    const upgrades = new Map([
      ['u-stripe', upgrade({ id: 'u-stripe', upgrade_mode: 'stripe' })],
      ['u-bank', upgrade({ id: 'u-bank', upgrade_mode: 'bank_transfer' })],
    ]);
    expect(classifyVipTicket(ticket({ upgrade_id: 'u-stripe', upgraded_from: 'standard' }), upgrades)).toEqual({
      eligible: true,
      reason: 'vip_upgrade_paid',
    });
    expect(classifyVipTicket(ticket({ upgrade_id: 'u-bank', upgraded_from: 'standard' }), upgrades)).toEqual({
      eligible: true,
      reason: 'vip_upgrade_paid',
    });
  });

  it('a complimentary upgrade is not eligible even though the original ticket was paid', () => {
    const upgrades = new Map([['u-comp', upgrade({ id: 'u-comp', upgrade_mode: 'complimentary' })]]);
    expect(
      classifyVipTicket(ticket({ upgrade_id: 'u-comp', upgraded_from: 'standard', amount_paid: 29900 }), upgrades)
    ).toEqual({ eligible: false, exclusion: 'complimentary_upgrade' });
  });

  it('an upgraded ticket without an upgrade record is excluded, not guessed at', () => {
    expect(classifyVipTicket(ticket({ upgrade_id: 'gone', upgraded_from: 'standard' }), none)).toEqual({
      eligible: false,
      exclusion: 'upgrade_record_missing',
    });
    expect(classifyVipTicket(ticket({ upgraded_from: 'standard' }), none)).toEqual({
      eligible: false,
      exclusion: 'upgrade_record_missing',
    });
  });
});

describe('buildHoodieAllocation', () => {
  it('lists speakers, paid VIP buyers and paid upgraders, and excludes comps with a reason', () => {
    const result = buildHoodieAllocation({
      speakers: [speaker()],
      tickets: [
        ticket(),
        ticket({ id: 't-upg', email: 'up@example.com', first_name: 'Uma', last_name: 'Upgrader', upgrade_id: 'u1', upgraded_from: 'standard', hoodie_size: null }),
        ticket({ id: 't-comp-upg', email: 'cu@example.com', first_name: 'Carl', last_name: 'Comp', upgrade_id: 'u2', upgraded_from: 'standard' }),
        ticket({ id: 't-comp', email: 'plusone@example.com', first_name: 'Paula', last_name: 'PlusOne', amount_paid: 0, payment_type: 'complimentary' }),
      ],
      upgrades: [upgrade({ id: 'u1' }), upgrade({ id: 'u2', upgrade_mode: 'complimentary' })],
    });

    expect(result.eligible.map((e) => e.email)).toEqual(['grace@example.com', 'ada@example.com', 'up@example.com']);
    expect(result.stats.eligible).toBe(3);
    expect(result.stats.by_reason).toEqual({ speaker: 1, vip_ticket_paid: 1, vip_upgrade_paid: 1 });
    expect(result.stats.with_size).toBe(2);
    expect(result.stats.missing_size).toBe(1);
    expect(result.stats.size_counts).toMatchObject({ M: 1, L: 1, S: 0 });

    expect(result.stats.excluded).toBe(2);
    expect(result.stats.excluded_by_reason).toEqual({
      complimentary_vip_ticket: 1,
      complimentary_upgrade: 1,
      upgrade_record_missing: 0,
    });
  });

  it('gives a speaker who also holds a complimentary VIP ticket exactly one hoodie, as a speaker', () => {
    const result = buildHoodieAllocation({
      speakers: [speaker({ hoodie_size: null })],
      tickets: [
        ticket({ id: 't-spk', email: 'ADA@example.com', first_name: 'Ada', last_name: 'Lovelace', amount_paid: 0, payment_type: 'complimentary', hoodie_size: 'XL', hoodie_handed_at: '2026-09-11T10:00:00Z' }),
      ],
      upgrades: [],
    });

    expect(result.stats.eligible).toBe(1);
    expect(result.stats.excluded).toBe(0);
    expect(result.eligible[0]).toMatchObject({
      reason: 'speaker',
      ticket_id: 't-spk',
      hoodie_size: 'XL',
      hoodie_handed_at: '2026-09-11T10:00:00Z',
    });
    expect(result.stats.handed).toBe(1);
    expect(result.stats.not_handed).toBe(0);
  });

  it('does not double count a speaker listed twice', () => {
    const result = buildHoodieAllocation({
      speakers: [speaker(), speaker({ id: 'spk-dup', email: ' Ada@Example.com ' })],
      tickets: [],
      upgrades: [],
    });
    expect(result.stats.eligible).toBe(1);
  });

  it('two paid VIP tickets under one email: same name is one hoodie, different names are two', () => {
    const dup = buildHoodieAllocation({
      speakers: [],
      tickets: [ticket({ id: 't1' }), ticket({ id: 't2', first_name: 'GRACE', last_name: 'hopper' })],
      upgrades: [],
    });
    expect(dup.stats.eligible).toBe(1);

    const partner = buildHoodieAllocation({
      speakers: [],
      tickets: [ticket({ id: 't1' }), ticket({ id: 't2', first_name: 'Howard', last_name: 'Aiken' })],
      upgrades: [],
    });
    expect(partner.stats.eligible).toBe(2);
  });

  it('stats partition the eligible list', () => {
    const result = buildHoodieAllocation({
      speakers: [speaker(), speaker({ id: 's2', email: 'b@example.com', hoodie_size: null })],
      tickets: [ticket(), ticket({ id: 't2', email: 'c@example.com', first_name: 'Cy', hoodie_handed_at: '2026-09-11T09:00:00Z' })],
      upgrades: [],
    });
    const { stats } = result;
    expect(Object.values(stats.by_reason).reduce((a, b) => a + b, 0)).toBe(stats.eligible);
    expect(stats.with_size + stats.missing_size).toBe(stats.eligible);
    expect(stats.handed + stats.not_handed).toBe(stats.eligible);
    expect(Object.values(stats.size_counts).reduce((a, b) => a + b, 0)).toBe(stats.with_size);
  });
});
