/**
 * GET /api/admin/hoodies
 * Covers the access gate and the metadata → input mapping: the upgrade id and
 * payment type must be read off ticket metadata and the hoodie size joined
 * from apparel preferences, or eligibility comes out wrong.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://prod-ref.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  getAdminSpeakersWithSubmissions: vi.fn(),
  tables: {} as Record<string, unknown[]>,
}));

vi.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: mocks.verifyAdminAccess }));
vi.mock('@/lib/cfp/admin', () => ({ getAdminSpeakersWithSubmissions: mocks.getAdminSpeakersWithSubmissions }));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      const chain: Promise<unknown> & { select: () => typeof chain; eq: () => typeof chain } = Object.assign(
        Promise.resolve({ data: mocks.tables[table] ?? [], error: null }),
        { select: () => chain, eq: () => chain }
      );
      return chain;
    },
  }),
}));

const handler = (await import('../hoodies')).default;

async function call(method = 'GET') {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const res = { status, json } as unknown as NextApiResponse;
  await handler({ method, cookies: {}, headers: {} } as unknown as NextApiRequest, res);
  return { status: status.mock.calls[0]?.[0] as number, body: json.mock.calls[0]?.[0] };
}

beforeEach(() => {
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false });
  mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([
    { id: 'spk', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', hoodie_size: 'M', submissions: [] },
  ]);
  mocks.tables.tickets = [
    { id: 't-paid', first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com', amount_paid: 45000, metadata: null, hoodie_handed_at: null },
    { id: 't-upg', first_name: 'Uma', last_name: 'Upgrader', email: 'uma@example.com', amount_paid: 29900, metadata: { upgraded_from: 'standard', upgrade_id: 'u-paid' }, hoodie_handed_at: '2026-09-11T09:00:00Z' },
    { id: 't-comp-upg', first_name: 'Carl', last_name: 'Comp', email: 'carl@example.com', amount_paid: 29900, metadata: { upgraded_from: 'standard', upgrade_id: 'u-comp' }, hoodie_handed_at: null },
    { id: 't-comp', first_name: 'Paula', last_name: 'PlusOne', email: 'paula@example.com', amount_paid: 0, metadata: { issuedManually: true, paymentType: 'complimentary' }, hoodie_handed_at: null },
  ];
  mocks.tables.ticket_apparel_preferences = [
    { ticket_id: 't-paid', hoodie_size: 'L' },
    { ticket_id: 't-comp', hoodie_size: 'S' },
  ];
  mocks.tables.ticket_upgrades = [
    { id: 'u-paid', upgrade_mode: 'bank_transfer', status: 'completed' },
    { id: 'u-comp', upgrade_mode: 'complimentary', status: 'completed' },
  ];
});

afterEach(() => vi.clearAllMocks());

describe('GET /api/admin/hoodies', () => {
  it('rejects unauthenticated requests', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false });
    expect((await call()).status).toBe(401);
  });

  it('only allows GET', async () => {
    expect((await call('POST')).status).toBe(405);
  });

  it('allocates hoodies to speakers, paid VIP buyers and paid upgraders only', async () => {
    const { status, body } = await call();

    expect(status).toBe(200);
    expect(body.stats.eligible).toBe(3);
    expect(body.stats.by_reason).toEqual({ speaker: 1, vip_ticket_paid: 1, vip_upgrade_paid: 1 });
    expect(body.stats.excluded_by_reason).toEqual({
      complimentary_vip_ticket: 1,
      complimentary_upgrade: 1,
      upgrade_record_missing: 0,
    });

    const grace = body.eligible.find((e: { email: string }) => e.email === 'grace@example.com');
    expect(grace.hoodie_size).toBe('L');
    const uma = body.eligible.find((e: { email: string }) => e.email === 'uma@example.com');
    expect(uma).toMatchObject({ reason: 'vip_upgrade_paid', hoodie_size: null, hoodie_handed_at: '2026-09-11T09:00:00Z' });
    expect(body.stats.handed).toBe(1);
    expect(body.stats.size_counts).toMatchObject({ M: 1, L: 1 });
    expect(typeof body.generated_at).toBe('string');
  });
});
