import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://example.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test';
});

const mocks = vi.hoisted(() => ({
  requireDoorOversight: vi.fn(),
  doorDashboard: vi.fn(),
}));

vi.mock('@/lib/checkin/guard', () => ({ requireDoorOversight: mocks.requireDoorOversight }));
vi.mock('@/lib/checkin/dashboard', () => ({ doorDashboard: mocks.doorDashboard }));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

const handler = (await import('../dashboard')).default;

const SNAPSHOT = {
  occasion: 'conference_day',
  generatedAt: '2026-09-11T08:00:00.000Z',
  expected: 300, arrived: 42, remaining: 258, goodieHandedOver: 30,
  arrivalsLast15Min: 20, arrivalsLast5Min: 7,
  stations: [], volunteers: [],
  anomalies: { refusals: 0, notFound: 0, manualAdmits: 3, duplicates: 1 },
};

function mockReqRes(method: string, query: Record<string, string> = {}) {
  const json = vi.fn();
  const setHeader = vi.fn();
  const res = { status: vi.fn(() => ({ json })), setHeader } as unknown as NextApiResponse;
  const req = { method, query, cookies: {}, headers: {} } as unknown as NextApiRequest;
  return { req, res, json, setHeader, statusOf: () => (res.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireDoorOversight.mockResolvedValue({ ok: true, staff: null });
  mocks.doorDashboard.mockResolvedValue(SNAPSHOT);
});

describe('access', () => {
  it('accepts an admin or a door lead via the oversight guard', async () => {
    const { req, res, statusOf } = mockReqRes('GET');
    await handler(req, res);
    expect(statusOf()).toBe(200);
  });

  it('refuses anyone the oversight guard rejects', async () => {
    mocks.requireDoorOversight.mockResolvedValue({ ok: false, status: 403, error: 'nope' });
    const { req, res, statusOf } = mockReqRes('GET');
    await handler(req, res);
    expect(statusOf()).toBe(403);
    expect(mocks.doorDashboard).not.toHaveBeenCalled();
  });

  it('rejects a non-GET method', async () => {
    const { req, res, statusOf } = mockReqRes('POST');
    await handler(req, res);
    expect(statusOf()).toBe(405);
  });
});

describe('occasion', () => {
  it('lets the server decide the day when none is given', async () => {
    const { req, res } = mockReqRes('GET');
    await handler(req, res);
    expect(mocks.doorDashboard).toHaveBeenCalledWith(undefined);
  });

  it('honours an explicit occasion for reviewing the other day', async () => {
    const { req, res } = mockReqRes('GET', { occasion: 'workshop_day' });
    await handler(req, res);
    expect(mocks.doorDashboard).toHaveBeenCalledWith('workshop_day');
  });

  // A junk value must fall back to the server's own answer rather than 400 —
  // this is a polled endpoint and a lead should never see the dashboard break
  // because of a stale query string.
  it('ignores an unrecognised occasion instead of failing', async () => {
    const { req, res, statusOf } = mockReqRes('GET', { occasion: 'community_day' });
    await handler(req, res);
    expect(statusOf()).toBe(200);
    expect(mocks.doorDashboard).toHaveBeenCalledWith(undefined);
  });
});

describe('polling hygiene', () => {
  // A cached poll response makes a stalled door look like a moving one.
  it('never allows a poll response to be cached', async () => {
    const { req, res, setHeader } = mockReqRes('GET');
    await handler(req, res);
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('returns counts only, with no attendee identifiers anywhere', async () => {
    const { req, res, json } = mockReqRes('GET');
    await handler(req, res);
    const body = JSON.stringify(json.mock.calls[0][0]);
    expect(body).not.toMatch(/@/);
    expect(body).not.toMatch(/ticket_id|firstName|lastName/);
  });

  it('surfaces a failure as 500 without leaking the database message', async () => {
    mocks.doorDashboard.mockRejectedValue(new Error('function door_dashboard does not exist'));
    const { req, res, statusOf, json } = mockReqRes('GET');
    await handler(req, res);
    expect(statusOf()).toBe(500);
    expect(json.mock.calls[0][0].error).not.toMatch(/door_dashboard/);
  });
});
