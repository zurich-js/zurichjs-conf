/**
 * GET /api/admin/after-party
 * The handler's own job is small: gate access, pull the four sources, and
 * shape them for the roster builder. These cover the gate and the one piece
 * of mapping logic that matters — a logistics row that was never submitted
 * must count as "unanswered", not as a yes or a no.
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
      // Awaitable at any point in the .select().eq().eq() chain
      const chain: Promise<unknown> & { select: () => typeof chain; eq: () => typeof chain } = Object.assign(
        Promise.resolve({ data: mocks.tables[table] ?? [], error: null }),
        { select: () => chain, eq: () => chain }
      );
      return chain;
    },
  }),
}));

const handler = (await import('../after-party')).default;

async function call(method = 'GET') {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const setHeader = vi.fn();
  const res = { status, json, setHeader } as unknown as NextApiResponse;
  await handler({ method, cookies: {}, headers: {} } as unknown as NextApiRequest, res);
  return {
    status: status.mock.calls[0]?.[0] as number,
    body: json.mock.calls[0]?.[0],
    headers: Object.fromEntries(setHeader.mock.calls as [string, string][]),
  };
}

const speakers = [
  { id: 'spk-yes', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', submissions: [] },
  { id: 'spk-draft', first_name: 'Bob', last_name: 'Draft', email: 'bob@example.com', submissions: [] },
  { id: 'spk-silent', first_name: 'Cy', last_name: 'Silent', email: 'cy@example.com', submissions: [] },
];

beforeEach(() => {
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false });
  mocks.getAdminSpeakersWithSubmissions.mockResolvedValue(speakers);
  mocks.tables.cfp_speaker_logistics = [
    {
      speaker_id: 'spk-yes',
      submitted_at: '2026-09-01T10:00:00Z',
      attending_after_party: true,
      after_party_plus_one: true,
      after_party_plus_one_first_name: 'Charles',
      after_party_plus_one_last_name: 'Babbage',
      after_party_plus_one_email: 'charles@example.com',
      dietary_restrictions: null,
    },
    {
      // Saved but never submitted — must not count as an answer
      speaker_id: 'spk-draft',
      submitted_at: null,
      attending_after_party: true,
      after_party_plus_one: false,
      after_party_plus_one_first_name: null,
      after_party_plus_one_last_name: null,
      after_party_plus_one_email: null,
      dietary_restrictions: null,
    },
  ];
  mocks.tables.speaker_activity_guests = [
    {
      id: 'g1',
      first_name: 'Vera',
      last_name: 'Volunteer',
      email: null,
      guest_type: 'volunteer',
      dietary_restrictions: null,
      admin_notes: null,
      related_speaker: null,
    },
  ];
  mocks.tables.tickets = [
    {
      id: 't1',
      first_name: 'Charles',
      last_name: 'Babbage',
      email: 'charles@example.com',
      company: null,
      amount_paid: 0,
      metadata: { issuedManually: true, paymentType: 'complimentary' },
      checked_in: null,
    },
    {
      id: 't2',
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace@example.com',
      company: 'Navy',
      amount_paid: 45000,
      metadata: null,
      checked_in: true,
    },
  ];
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/after-party', () => {
  it('rejects unauthenticated requests', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false });
    expect((await call()).status).toBe(401);
  });

  it('never lets the response be cached — it carries attendee emails and notes', async () => {
    expect((await call()).headers['Cache-Control']).toBe('private, no-store, max-age=0');
    // Also on the early exits, so a 401/405 body is never cached either
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false });
    expect((await call()).headers['Cache-Control']).toBe('private, no-store, max-age=0');
  });

  it('only allows GET', async () => {
    expect((await call('POST')).status).toBe(405);
  });

  it('builds the de-duplicated roster with capacity stats', async () => {
    const { status, body } = await call();

    expect(status).toBe(200);
    // Ada, Charles (plus one merged with his comp ticket), Vera, Grace
    expect(body.stats.headcount).toBe(4);
    expect(body.stats.capacity).toBe(90);
    expect(body.stats.by_source).toEqual({
      speaker: 1,
      speaker_plus_one: 1,
      activity_guest: 1,
      vip_ticket: 1,
    });
    expect(body.stats.plus_ones_needing_ticket).toBe(0);
    expect(body.stats.vip_tickets_total).toBe(2);
    expect(body.stats.vip_tickets_complimentary).toBe(1);
    expect(typeof body.generated_at).toBe('string');

    const charles = body.attendees.find((a: { email: string | null }) => a.email === 'charles@example.com');
    expect(charles.sources).toEqual(['speaker_plus_one', 'vip_ticket']);
    expect(charles.ticket).toMatchObject({ id: 't1', complimentary: true });

    const grace = body.attendees.find((a: { email: string | null }) => a.email === 'grace@example.com');
    expect(grace.ticket).toMatchObject({ checked_in: true, company: 'Navy' });
  });

  it('treats unsubmitted logistics rows and missing rows as unanswered', async () => {
    const { body } = await call();

    // Bob's draft said yes but was never submitted; Cy has no row at all
    expect(body.stats.speakers_unanswered).toBe(2);
    expect(body.stats.speakers_declined).toBe(0);
    expect(body.stats.potential_headcount).toBe(6);
    expect(body.attendees.some((a: { email: string | null }) => a.email === 'bob@example.com')).toBe(false);
  });
});
