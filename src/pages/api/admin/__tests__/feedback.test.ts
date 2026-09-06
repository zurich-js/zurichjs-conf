/**
 * GET /api/admin/feedback
 * Gate + shape: unauthenticated callers get nothing, admins get the rolled-up
 * payload with no-store caching (comments name real speakers).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://prod-ref.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  getAdminScheduleRows: vi.fn(),
  feedback: { data: [] as unknown[], error: null as unknown },
}));

vi.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: mocks.verifyAdminAccess }));
vi.mock('@/lib/program/schedule', () => ({ getAdminScheduleRows: mocks.getAdminScheduleRows }));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: () => ({ select: () => ({ order: async () => mocks.feedback }) }),
  }),
}));

const handler = (await import('../feedback')).default;

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

const scheduleRows = [
  {
    id: 'item-1',
    date: '2026-09-11',
    start_time: '09:00:00',
    duration_minutes: 45,
    room: null,
    type: 'session',
    title: 'Slot',
    description: null,
    session_id: 'sess-1',
    submission_id: null,
    is_visible: true,
    vip_only: false,
    program_session: { id: 'sess-1', cfp_submission_id: null, kind: 'talk', title: 'Keynote', abstract: null, level: null, status: 'published', metadata: null, speakers: [] },
  },
];

beforeEach(() => {
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false, botClient: null });
  mocks.getAdminScheduleRows.mockResolvedValue({ rows: scheduleRows });
  mocks.feedback = {
    data: [
      { id: 'f1', schedule_item_id: 'item-1', session_id: 'sess-1', rating: 5, comment: 'Loved it', created_at: '2026-09-11T08:00:00.000Z' },
      { id: 'f2', schedule_item_id: 'item-1', session_id: 'sess-1', rating: 3, comment: null, created_at: '2026-09-11T08:01:00.000Z' },
    ],
    error: null,
  };
});

describe('GET /api/admin/feedback', () => {
  it('rejects non-GET', async () => {
    expect((await call('POST')).status).toBe(405);
  });

  it('requires admin access', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false, isBot: false, botClient: null });
    expect((await call()).status).toBe(401);
  });

  it('returns the rolled-up overview with no-store caching', async () => {
    const result = await call();
    expect(result.status).toBe(200);
    expect(result.headers['Cache-Control']).toContain('no-store');
    expect(result.body.totals).toEqual({ responses: 2, averageRating: 4, sessionsWithFeedback: 1 });
    expect(result.body.sessions[0]).toMatchObject({ scheduleItemId: 'item-1', title: 'Keynote', responseCount: 2, averageRating: 4 });
    expect(result.body.entries.map((e: { id: string }) => e.id)).toEqual(['f2', 'f1']);
  });

  it('surfaces a feedback query failure as 500', async () => {
    mocks.feedback = { data: [], error: { message: 'boom' } };
    expect((await call()).status).toBe(500);
  });

  it('surfaces a schedule load failure as 500', async () => {
    mocks.getAdminScheduleRows.mockResolvedValue({ rows: [], error: 'db down' });
    expect((await call()).status).toBe(500);
  });
});
