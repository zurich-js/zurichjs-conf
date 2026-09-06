import { describe, it, expect, beforeEach, vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

const tableResults = new Map<string, QueryResult>();
/** Tables whose query resolves only after a delay, to exercise the abort path. */
const tableDelays = new Map<string, number>();
const fromCalls: string[] = [];
const selectCalls: Array<{ table: string; columns: string }> = [];
const abortSignals: AbortSignal[] = [];

vi.mock('@/lib/url', () => ({ getBaseUrl: () => 'http://localhost:3000' }));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      fromCalls.push(table);
      const result = (): QueryResult => tableResults.get(table) ?? { data: null, error: null };
      let signal: AbortSignal | undefined;

      // Mirrors PostgREST: an aborted query resolves with an error rather
      // than rejecting.
      const settle = (): Promise<QueryResult> => {
        const delay = tableDelays.get(table);
        if (delay === undefined) return Promise.resolve(result());

        return new Promise((resolve) => {
          const id = setTimeout(() => resolve(result()), delay);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(id);
              resolve({ data: null, error: { message: 'AbortError: The user aborted a request.' } });
            },
            { once: true }
          );
        });
      };

      const builder = {
        select: (columns: string) => {
          selectCalls.push({ table, columns });
          return builder;
        },
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        abortSignal: (value: AbortSignal) => {
          signal = value;
          abortSignals.push(value);
          return builder;
        },
        single: settle,
        maybeSingle: settle,
      };
      return builder;
    },
  }),
}));

import { generateOrderToken } from '@/lib/auth/orderToken';
import { getOrderDetails, getOrderDetailsForToken } from '../order-details';

const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';
const CURRENT_NONCE = '9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9';
const ROTATED_NONCE = 'ec639162-d93b-49fb-b70d-62b47a5b41be';

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
    tableDelays.clear();
    fromCalls.length = 0;
    selectCalls.length = 0;
    abortSignals.length = 0;
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

  it('skips the tickets query when the caller already has the row', async () => {
    const details = await getOrderDetails(TICKET_ID, { ticket: makeTicket() as never });

    expect(fromCalls).not.toContain('tickets');
    expect(fromCalls).toHaveLength(4);
    expect(details?.ticket.id).toBe(TICKET_ID);
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
          email: 'ada@example.com',
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
        email: 'ada@example.com',
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
        profile: { email: 'not-an-email' },
      },
      error: null,
    });

    const details = await getOrderDetails(TICKET_ID);

    expect(details?.networking).toBeUndefined();
  });
});

describe('getOrderDetailsForToken', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');
    tableResults.clear();
    tableDelays.clear();
    fromCalls.length = 0;
    selectCalls.length = 0;
    abortSignals.length = 0;
    tableResults.set('tickets', {
      data: {
        ...makeTicket(),
        manage_token_nonce: CURRENT_NONCE,
        legacy_manage_token_valid: false,
      },
      error: null,
    });
  });

  function validToken() {
    return generateOrderToken(TICKET_ID, CURRENT_NONCE);
  }

  it('reads tickets once for both the access check and the response', async () => {
    const result = await getOrderDetailsForToken(validToken());

    expect(result.status).toBe('ok');
    expect(fromCalls.filter((table) => table === 'tickets')).toHaveLength(1);
    // One read of tickets plus the four satellite lookups
    expect(fromCalls).toHaveLength(5);
  });

  it('keeps the token nonce out of the response', async () => {
    const result = await getOrderDetailsForToken(validToken());

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.details.ticket).not.toHaveProperty('manage_token_nonce');
    expect(result.details.ticket).not.toHaveProperty('legacy_manage_token_valid');
    expect(JSON.stringify(result.details)).not.toContain(CURRENT_NONCE);
  });

  it('rejects a token whose nonce has been rotated', async () => {
    const staleToken = generateOrderToken(TICKET_ID, ROTATED_NONCE);

    await expect(getOrderDetailsForToken(staleToken)).resolves.toEqual({ status: 'unauthorized' });
  });

  it('does not query at all for a malformed token', async () => {
    await expect(getOrderDetailsForToken('not-a-uuid.nonce.signature')).resolves.toEqual({
      status: 'unauthorized',
    });
    expect(fromCalls).toHaveLength(0);
  });

  it('treats a missing ticket as unauthorized', async () => {
    tableResults.set('tickets', { data: null, error: null });

    await expect(getOrderDetailsForToken(validToken())).resolves.toEqual({ status: 'unauthorized' });
  });

  it('reports a lookup failure separately from a rejected token', async () => {
    tableResults.set('tickets', { data: null, error: { message: 'database unavailable' } });

    await expect(getOrderDetailsForToken(validToken())).resolves.toEqual({ status: 'error' });
  });

  it('times out and cancels the in-flight queries once the budget expires', async () => {
    tableDelays.set('tickets', 1000);

    const result = await getOrderDetailsForToken(validToken(), { timeoutMs: 10 });

    expect(result).toEqual({ status: 'timed-out' });
    expect(abortSignals).not.toHaveLength(0);
    // The queries are cancelled, not left running against a struggling database
    expect(abortSignals.every((signal) => signal.aborted)).toBe(true);
  });

  it('clears the budget timer on the fast path', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    await getOrderDetailsForToken(validToken(), { timeoutMs: 5000 });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
