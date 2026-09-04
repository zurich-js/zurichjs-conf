import { describe, it, expect } from 'vitest';
import {
  buildAfterPartyRoster,
  type AfterPartyGuestInput,
  type AfterPartySpeakerInput,
  type AfterPartyTicketInput,
} from '../roster';

function speaker(overrides: Partial<AfterPartySpeakerInput> = {}): AfterPartySpeakerInput {
  return {
    id: 'spk-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    attending_after_party: true,
    after_party_plus_one: false,
    after_party_plus_one_first_name: null,
    after_party_plus_one_last_name: null,
    after_party_plus_one_email: null,
    dietary_restrictions: null,
    ...overrides,
  };
}

function guest(overrides: Partial<AfterPartyGuestInput> = {}): AfterPartyGuestInput {
  return {
    id: 'guest-1',
    first_name: 'Vera',
    last_name: 'Volunteer',
    email: 'vera@example.com',
    guest_type: 'volunteer',
    related_speaker_name: null,
    dietary_restrictions: null,
    admin_notes: null,
    ...overrides,
  };
}

function ticket(overrides: Partial<AfterPartyTicketInput> = {}): AfterPartyTicketInput {
  return {
    id: 'tkt-1',
    first_name: 'Grace',
    last_name: 'Hopper',
    email: 'grace@example.com',
    company: 'Navy',
    amount_paid: 45000,
    payment_type: null,
    checked_in: false,
    ...overrides,
  };
}

describe('buildAfterPartyRoster', () => {
  it('counts attending speakers, their plus ones, guests and VIP tickets once each', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [
          speaker({
            after_party_plus_one: true,
            after_party_plus_one_first_name: 'Charles',
            after_party_plus_one_last_name: 'Babbage',
            after_party_plus_one_email: 'charles@example.com',
          }),
        ],
        guests: [guest()],
        tickets: [ticket()],
      },
      90
    );

    expect(roster.stats.headcount).toBe(4);
    expect(roster.stats.by_source).toEqual({
      speaker: 1,
      speaker_plus_one: 1,
      activity_guest: 1,
      vip_ticket: 1,
    });
    expect(roster.stats.remaining).toBe(86);
    expect(roster.stats.over_capacity).toBe(false);
    expect(roster.stats.over_by).toBe(0);
  });

  it('merges a plus one with their issued VIP ticket by email (case-insensitive)', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [
          speaker({
            after_party_plus_one: true,
            after_party_plus_one_first_name: 'Charles',
            after_party_plus_one_last_name: 'Babbage',
            after_party_plus_one_email: 'Charles@Example.com ',
          }),
        ],
        guests: [],
        tickets: [
          ticket({
            id: 'tkt-plus-one',
            first_name: 'Charles',
            last_name: 'Babbage',
            email: 'charles@example.com',
            amount_paid: 0,
            payment_type: 'complimentary',
          }),
        ],
      },
      90
    );

    expect(roster.stats.headcount).toBe(2);
    const charles = roster.attendees.find((a) => a.email === 'charles@example.com');
    expect(charles?.sources).toEqual(['speaker_plus_one', 'vip_ticket']);
    expect(charles?.primary_source).toBe('speaker_plus_one');
    expect(charles?.needs_vip_ticket).toBe(false);
    expect(charles?.ticket).toMatchObject({ id: 'tkt-plus-one', complimentary: true });
    expect(roster.stats.plus_ones_needing_ticket).toBe(0);
    expect(roster.stats.vip_tickets_total).toBe(1);
    expect(roster.stats.vip_tickets_complimentary).toBe(1);
  });

  it('flags plus ones whose VIP ticket has not been issued yet', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [
          speaker({
            after_party_plus_one: true,
            after_party_plus_one_first_name: 'Charles',
            after_party_plus_one_last_name: 'Babbage',
            after_party_plus_one_email: 'charles@example.com',
          }),
        ],
        guests: [],
        tickets: [],
      },
      90
    );

    const charles = roster.attendees.find((a) => a.email === 'charles@example.com');
    expect(charles?.needs_vip_ticket).toBe(true);
    expect(charles?.related_speaker_name).toBe('Ada Lovelace');
    expect(roster.stats.plus_ones_needing_ticket).toBe(1);
  });

  it('counts a speaker who also holds a VIP ticket once, as a speaker', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [speaker()],
        guests: [],
        tickets: [ticket({ first_name: 'Ada', last_name: 'Lovelace', email: 'ADA@example.com' })],
      },
      90
    );

    expect(roster.stats.headcount).toBe(1);
    expect(roster.attendees[0].sources).toEqual(['speaker', 'vip_ticket']);
    expect(roster.stats.by_source.speaker).toBe(1);
    expect(roster.stats.by_source.vip_ticket).toBe(0);
    expect(roster.stats.vip_tickets_total).toBe(1);
  });

  it('excludes declined speakers but keeps them if they hold a VIP ticket, flagged', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [
          speaker({ attending_after_party: false }),
          speaker({ id: 'spk-2', email: 'bob@example.com', first_name: 'Bob', attending_after_party: false }),
        ],
        guests: [],
        tickets: [ticket({ first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' })],
      },
      90
    );

    expect(roster.stats.headcount).toBe(1);
    expect(roster.attendees[0].primary_source).toBe('vip_ticket');
    expect(roster.attendees[0].speaker_declined).toBe(true);
    expect(roster.stats.speakers_declined).toBe(2);
  });

  it('reports unanswered speakers as potential extra headcount, minus those already listed', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [
          speaker({ attending_after_party: null }),
          speaker({ id: 'spk-2', email: 'bob@example.com', first_name: 'Bob', attending_after_party: null }),
        ],
        guests: [],
        tickets: [ticket({ email: 'bob@example.com', first_name: 'Bob', last_name: 'Lovelace' })],
      },
      90
    );

    expect(roster.stats.headcount).toBe(1);
    expect(roster.stats.speakers_unanswered).toBe(1);
    expect(roster.stats.potential_headcount).toBe(2);
  });

  it('warns when over capacity without dropping anyone', () => {
    const tickets = Array.from({ length: 5 }, (_, i) =>
      ticket({ id: `tkt-${i}`, email: `holder${i}@example.com`, last_name: `Holder${i}` })
    );
    const roster = buildAfterPartyRoster({ speakers: [], guests: [], tickets }, 3);

    expect(roster.attendees).toHaveLength(5);
    expect(roster.stats.headcount).toBe(5);
    expect(roster.stats.over_capacity).toBe(true);
    expect(roster.stats.over_by).toBe(2);
    expect(roster.stats.remaining).toBe(-2);
  });

  it('keeps guests without an email as separate people', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [],
        guests: [
          guest({ id: 'g1', email: null, first_name: 'Anon', last_name: 'One' }),
          guest({ id: 'g2', email: null, first_name: 'Anon', last_name: 'Two' }),
        ],
        tickets: [],
      },
      90
    );

    expect(roster.stats.headcount).toBe(2);
  });

  it('sorts attendees by last name then first name', () => {
    const roster = buildAfterPartyRoster(
      {
        speakers: [],
        guests: [],
        tickets: [
          ticket({ id: 't1', email: 'z@example.com', first_name: 'Zed', last_name: 'Zulu' }),
          ticket({ id: 't2', email: 'a@example.com', first_name: 'Amy', last_name: 'Alpha' }),
        ],
      },
      90
    );

    expect(roster.attendees.map((a) => a.last_name)).toEqual(['Alpha', 'Zulu']);
  });
});
