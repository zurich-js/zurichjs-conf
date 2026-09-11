/**
 * GET /api/admin/networking
 * The handler gates access, refuses non-GET methods, and hands the loaded
 * rows to the directory builder. Supabase is mocked at the boundary.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://conf.zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://prod-ref.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  tables: {} as Record<string, unknown[]>,
  failures: new Set<string>(),
}));

vi.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: mocks.verifyAdminAccess }));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      // Awaitable at any point in the .select().order().range() / .select().in() chain
      const result = mocks.failures.has(table)
        ? { data: null, error: { message: `${table} exploded` } }
        : { data: mocks.tables[table] ?? [], error: null };
      type Chain = Promise<unknown> & {
        select: () => Chain;
        order: () => Chain;
        range: () => Chain;
        in: () => Chain;
      };
      const chain: Chain = Object.assign(
        Promise.resolve(result) as Promise<unknown>,
        { select: () => chain, order: () => chain, range: () => chain, in: () => chain }
      );
      return chain;
    },
  }),
}));

const handler = (await import('../networking/index')).default;

async function call(method = 'GET') {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const setHeader = vi.fn();
  const res = { status, json, setHeader } as unknown as NextApiResponse;
  await handler({ method, cookies: {}, headers: { host: 'conf.zurichjs.com' } } as unknown as NextApiRequest, res);
  return {
    status: status.mock.calls[0]?.[0] as number,
    body: json.mock.calls[0]?.[0],
    headers: Object.fromEntries(setHeader.mock.calls as [string, string][]),
  };
}

beforeEach(() => {
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false });
  mocks.failures.clear();
  mocks.tables.networking_profiles = [
    {
      id: 'np-1',
      subject_type: 'attendee',
      ticket_id: 'tkt-1',
      sponsor_id: null,
      share_id: 'share-1',
      enabled: true,
      profile: { githubUrl: 'https://github.com/ada' },
      updated_at: '2026-09-01T10:00:00Z',
    },
  ];
  mocks.tables.tickets = [
    {
      id: 'tkt-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      company: null,
      job_title: null,
      ticket_category: 'standard',
      status: 'confirmed',
    },
  ];
  mocks.tables.sponsors = [];
  mocks.tables.manual_badge_entries = [];
});

describe('GET /api/admin/networking', () => {
  it('rejects unauthenticated requests', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false, isBot: false });
    const { status, body } = await call();
    expect(status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('only allows GET', async () => {
    const { status, headers } = await call('POST');
    expect(status).toBe(405);
    expect(headers.Allow).toBe('GET');
  });

  it('returns the directory with stats and never lets it be cached', async () => {
    const { status, body, headers } = await call();
    expect(status).toBe(200);
    expect(headers['Cache-Control']).toBe('private, no-store, max-age=0');
    expect(body.stats).toEqual({
      total: 1,
      enabled: 1,
      bySource: {
        attendee: { total: 1, enabled: 1 },
        sponsor: { total: 0, enabled: 0 },
        manual: { total: 0, enabled: 0 },
      },
    });
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]).toMatchObject({
      name: 'Ada Lovelace',
      enabled: true,
      contactEmail: 'ada@example.com',
      shareUrl: 'https://conf.zurichjs.com/share/attendee-share-1',
    });
    expect(body.entries[0].links.map((link: { kind: string }) => link.kind)).toEqual(['github']);
    expect(typeof body.generated_at).toBe('string');
  });

  it('returns 500 when a query fails', async () => {
    mocks.failures.add('tickets');
    const { status, body } = await call();
    expect(status).toBe(500);
    expect(body).toEqual({ error: 'Failed to load networking directory' });
  });
});
