/**
 * POST /api/feedback/session
 * The route's job is to turn "anyone can post" into "only a real, started
 * session, once per browser". These pin the gates: validation, visibility,
 * the venue clock, and the duplicate → 409 mapping.
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
  item: null as Record<string, unknown> | null,
  insert: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: mocks.verifyAdminAccess }));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === 'program_schedule_items') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: mocks.item, error: null }) }),
          }),
        };
      }
      return { insert: mocks.insert };
    },
  }),
}));

const handler = (await import('../feedback/session')).default;

const ITEM_ID = '11111111-1111-4111-8111-111111111111';
const validBody = { scheduleItemId: ITEM_ID, clientId: 'browser-abc-123', rating: 4, comment: 'Great talk' };

async function call(body: unknown, method = 'POST') {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const res = { status, json, setHeader: vi.fn() } as unknown as NextApiResponse;
  await handler(
    { method, body, cookies: {}, headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` } } as unknown as NextApiRequest,
    res
  );
  return { status: status.mock.calls[0]?.[0] as number, body: json.mock.calls[0]?.[0] };
}

beforeEach(() => {
  // Conference day, 09:30 venue time — the 09:00 talk is live.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-11T07:30:00.000Z'));
  mocks.verifyAdminAccess.mockReturnValue({ authorized: false, isBot: false, botClient: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.item = {
    id: ITEM_ID,
    date: '2026-09-11',
    start_time: '09:00:00',
    duration_minutes: 45,
    type: 'session',
    is_visible: true,
    session_id: 'sess-1',
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('POST /api/feedback/session', () => {
  it('rejects non-POST', async () => {
    expect((await call(validBody, 'GET')).status).toBe(405);
  });

  it('validates the body', async () => {
    expect((await call({ ...validBody, rating: 6 })).status).toBe(400);
    expect((await call({ ...validBody, rating: 4.5 })).status).toBe(400);
    expect((await call({ ...validBody, clientId: 'short' })).status).toBe(400);
    expect((await call({ ...validBody, clientId: 'has spaces and @' })).status).toBe(400);
    expect((await call({ ...validBody, scheduleItemId: 'not-a-uuid' })).status).toBe(400);
  });

  it('stores a rating for a live session, trimming an empty comment to null', async () => {
    const result = await call({ ...validBody, comment: '   ' });
    expect(result.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({
      schedule_item_id: ITEM_ID,
      session_id: 'sess-1',
      client_id: 'browser-abc-123',
      rating: 4,
      comment: null,
    });
  });

  it('stores a rating for a session that has already ended', async () => {
    vi.setSystemTime(new Date('2026-09-11T15:00:00.000Z'));
    expect((await call(validBody)).status).toBe(201);
  });

  it('refuses feedback before the session starts', async () => {
    vi.setSystemTime(new Date('2026-09-11T06:59:00.000Z'));
    const result = await call(validBody);
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('NOT_OPEN');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('lets an admin rate ahead of the clock (schedule preview)', async () => {
    vi.setSystemTime(new Date('2026-09-11T06:59:00.000Z'));
    mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false, botClient: null });
    expect((await call(validBody)).status).toBe(201);
  });

  it('honours a rehearsal instant outside production', async () => {
    vi.setSystemTime(new Date('2026-09-01T10:00:00.000Z'));
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect((await call({ ...validBody, previewAt: '2026-09-11T07:30:00Z' })).status).toBe(201);
  });

  it('ignores the rehearsal instant on production', async () => {
    vi.setSystemTime(new Date('2026-09-01T10:00:00.000Z'));
    vi.stubEnv('VERCEL_ENV', 'production');
    const result = await call({ ...validBody, previewAt: '2026-09-11T07:30:00Z' });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('NOT_OPEN');
  });

  it('rejects a malformed rehearsal instant', async () => {
    expect((await call({ ...validBody, previewAt: 'tomorrow' })).status).toBe(400);
  });

  it('refuses feedback once the window after the conference has closed', async () => {
    vi.setSystemTime(new Date('2026-09-20T10:00:00.000Z'));
    expect((await call(validBody)).status).toBe(403);
  });

  it('404s for hidden items, non-sessions and unknown ids', async () => {
    mocks.item = { ...mocks.item, is_visible: false };
    expect((await call(validBody)).status).toBe(404);
    mocks.item = { ...mocks.item, is_visible: true, type: 'break', session_id: null };
    expect((await call(validBody)).status).toBe(404);
    mocks.item = null;
    expect((await call(validBody)).status).toBe(404);
  });

  it('maps a duplicate submission to 409', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    const result = await call(validBody);
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('ALREADY_SUBMITTED');
  });

  it('returns 500 on other insert failures', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '42P01', message: 'boom' } });
    expect((await call(validBody)).status).toBe(500);
  });
});
