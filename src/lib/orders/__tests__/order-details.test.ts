import { describe, it, expect, beforeEach, vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

const tableResults = new Map<string, QueryResult>();
const fromCalls: string[] = [];
const selectCalls: Array<{ table: string; columns: string }> = [];

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      fromCalls.push(table);
      const result = (): QueryResult => tableResults.get(table) ?? { data: null, error: null };
      const builder = {
        select: (columns: string) => {
          selectCalls.push({ table, columns });
          return builder;
        },
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        single: () => Promise.resolve(result()),
        maybeSingle: () => Promise.resolve(result()),
      };
      return builder;
    },
  }),
}));

import { getOrderDetails } from '../order-details';

const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    email: 'attendee@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    ticket_category: 'standard',
    ticket_stage: 'early_bird',
    amount_paid: 250,
    currency: 'CHF',
    status: 'confirmed',
    qr_code_url: 'https://example.com/qr.png',
    transferred_from_name: null,
    transferred_from_email: null,
    transferred_at: null,
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('getOrderDetails', () => {
  beforeEach(() => {
    tableResults.clear();
    fromCalls.length = 0;
    selectCalls.length = 0;
    tableResults.set('tickets', { data: makeTicket(), error: null });
  });

  it('returns null when the ticket cannot be fetched', async () => {
    tableResults.set('tickets', { data: null, error: { message: 'not found' } });

    expect(await getOrderDetails(TICKET_ID)).toBeNull();
  });

  it('returns the bare ticket when there are no extras', async () => {
    const details = await getOrderDetails(TICKET_ID);

    expect(details).not.toBeNull();
    expect(details?.ticket.id).toBe(TICKET_ID);
    expect(details?.transferInfo).toBeUndefined();
    expect(details?.pendingUpgrade).toBeUndefined();
    expect(details?.vipPerk).toBeUndefined();
    expect(details?.apparelPreferences).toBeUndefined();
  });

  it('selects only the ticket fields used by the manage-order response', async () => {
    await getOrderDetails(TICKET_ID);

    const ticketSelect = selectCalls.find((call) => call.table === 'tickets')?.columns;
    expect(ticketSelect).not.toBe('*');
    expect(ticketSelect).not.toContain('stripe_customer_id');
    expect(ticketSelect).not.toContain('stripe_session_id');
    expect(ticketSelect).not.toContain('metadata');
    expect(ticketSelect).not.toContain('manage_token_nonce');
  });

  it('dispatches all five queries up front instead of serially', async () => {
    const pending = getOrderDetails(TICKET_ID);

    // Promise.all issues every query before any result resolves
    expect(fromCalls).toEqual(
      expect.arrayContaining([
        'tickets',
        'ticket_upgrades',
        'vip_perks',
        'ticket_apparel_preferences',
        'networking_profiles',
      ])
    );
    expect(fromCalls).toHaveLength(5);

    await pending;
  });

  it('includes transfer info when the ticket was transferred', async () => {
    tableResults.set('tickets', {
      data: makeTicket({
        transferred_from_name: 'Grace Hopper',
        transferred_from_email: 'grace@example.com',
        transferred_at: '2026-02-01T09:00:00Z',
      }),
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.transferInfo).toEqual({
      transferredFrom: 'Grace Hopper',
      transferredFromEmail: 'grace@example.com',
      transferredAt: '2026-02-01T09:00:00Z',
    });
  });

  it('maps a pending upgrade', async () => {
    tableResults.set('ticket_upgrades', {
      data: {
        id: 'upgrade-1',
        status: 'pending_bank_transfer',
        upgrade_mode: 'bank_transfer',
        amount: 15000,
        currency: 'CHF',
        stripe_payment_link_url: null,
        bank_transfer_reference: 'REF-123',
        bank_transfer_due_date: '2026-03-01',
        created_at: '2026-02-10T12:00:00Z',
      },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.pendingUpgrade).toEqual({
      id: 'upgrade-1',
      status: 'pending_bank_transfer',
      upgradeMode: 'bank_transfer',
      amount: 15000,
      currency: 'CHF',
      stripePaymentLinkUrl: null,
      bankTransferReference: 'REF-123',
      bankTransferDueDate: '2026-03-01',
      createdAt: '2026-02-10T12:00:00Z',
    });
  });

  it('includes the VIP perk for VIP tickets', async () => {
    tableResults.set('tickets', { data: makeTicket({ ticket_category: 'vip' }), error: null });
    tableResults.set('vip_perks', {
      data: {
        code: 'VIP-WORKSHOP-20',
        discount_percent: 20,
        expires_at: '2026-09-01T00:00:00Z',
        max_redemptions: 1,
        current_redemptions: 0,
      },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.vipPerk).toEqual({
      code: 'VIP-WORKSHOP-20',
      discountPercent: 20,
      expiresAt: '2026-09-01T00:00:00Z',
      isRedeemed: false,
    });
  });

  it('marks the VIP perk redeemed once redemptions are exhausted', async () => {
    tableResults.set('tickets', { data: makeTicket({ ticket_category: 'vip' }), error: null });
    tableResults.set('vip_perks', {
      data: {
        code: 'VIP-WORKSHOP-20',
        discount_percent: 20,
        expires_at: null,
        max_redemptions: 1,
        current_redemptions: 1,
      },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.vipPerk?.isRedeemed).toBe(true);
  });

  it('omits the VIP perk for non-VIP tickets even when a perk row exists', async () => {
    tableResults.set('vip_perks', {
      data: { code: 'X', discount_percent: 20, expires_at: null, max_redemptions: null, current_redemptions: 0 },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.vipPerk).toBeUndefined();
  });

  it('treats a VIP perk fetch error as non-fatal', async () => {
    tableResults.set('tickets', { data: makeTicket({ ticket_category: 'vip' }), error: null });
    tableResults.set('vip_perks', { data: null, error: { message: 'boom' } });

    const details = await getOrderDetails(TICKET_ID);

    expect(details).not.toBeNull();
    expect(details?.vipPerk).toBeUndefined();
  });

  it('includes saved apparel preferences', async () => {
    tableResults.set('ticket_apparel_preferences', {
      data: { tshirt_size: 'M', hoodie_size: null },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.apparelPreferences).toEqual({ tshirtSize: 'M', hoodieSize: null });
  });

  it('includes a valid attendee networking profile', async () => {
    tableResults.set('networking_profiles', {
      data: {
        share_id: '11111111-2222-4333-8444-555555555555',
        enabled: true,
        profile: {
          linkedinUrl: 'https://linkedin.com/in/ada',
          githubUrl: null,
          xHandle: '@ada',
          blueskyHandle: null,
          mastodonHandle: '@ada@fosstodon.org',
          websiteUrl: 'https://ada.example.com',
        },
      },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.networking).toEqual({
      shareId: '11111111-2222-4333-8444-555555555555',
      enabled: true,
      profile: {
        linkedinUrl: 'https://linkedin.com/in/ada',
        githubUrl: null,
        xHandle: '@ada',
        blueskyHandle: null,
        mastodonHandle: '@ada@fosstodon.org',
        websiteUrl: 'https://ada.example.com',
      },
    });
  });

  it('does not expose malformed networking profile data', async () => {
    tableResults.set('networking_profiles', {
      data: {
        share_id: '11111111-2222-4333-8444-555555555555',
        enabled: true,
        profile: { email: 'private@example.com' },
      },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.networking).toBeUndefined();
  });
});
