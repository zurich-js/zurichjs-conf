/**
 * Tests for the door API routes and the shared guard.
 *
 * The authorization matrix is what these lock down: which role reaches which
 * route, and that a refusal is a clean status rather than a 500.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://example.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-key';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getStaffByUserId: vi.fn(),
  doorResolve: vi.fn(),
  doorCheckIn: vi.fn(),
  doorCheckInUndo: vi.fn(),
  doorGoodieHandover: vi.fn(),
  doorBadgePickup: vi.fn(),
  doorCurrentOccasion: vi.fn(),
  buildDoorRoster: vi.fn(),
  verifyAdminAccess: vi.fn(),
}));

vi.mock('@/lib/cfp/auth', () => ({
  createSupabaseApiClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/lib/checkin/staff', () => ({ getStaffByUserId: mocks.getStaffByUserId }));
vi.mock('@/lib/checkin/rpc', () => ({
  doorResolve: mocks.doorResolve,
  doorCheckIn: mocks.doorCheckIn,
  doorCheckInUndo: mocks.doorCheckInUndo,
  doorGoodieHandover: mocks.doorGoodieHandover,
  doorBadgePickup: mocks.doorBadgePickup,
  doorCurrentOccasion: mocks.doorCurrentOccasion,
}));
vi.mock('@/lib/checkin/roster', () => ({ buildDoorRoster: mocks.buildDoorRoster }));
vi.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: mocks.verifyAdminAccess }));
vi.mock('@/lib/logger', () => ({
  logger: {
    scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

const sessionHandler = (await import('../session')).default;
const resolveHandler = (await import('../resolve')).default;
const checkInHandler = (await import('../check-in')).default;
const undoHandler = (await import('../undo')).default;
const manualAdmitHandler = (await import('../manual-admit')).default;
const goodieHandler = (await import('../goodie')).default;
const badgePickupHandler = (await import('../badge-pickup')).default;
const rosterHandler = (await import('../roster')).default;

const UUID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const USER = { id: 'user-1', email: 'scanner@zurichjs.com' };

function staff(role: 'door_lead' | 'scanner' | 'goodie') {
  return {
    id: 'staff-1',
    email: `${role}@zurichjs.com`,
    name: role,
    role,
    isActive: true,
    invitedAt: '2026-09-01T00:00:00.000Z',
    invitedBy: null,
    acceptedAt: '2026-09-01T00:00:00.000Z',
  };
}

function mockReqRes(method: string, body: unknown = {}, query: Record<string, string> = {}) {
  const json = vi.fn();
  const setHeader = vi.fn();
  const res = { status: vi.fn(() => ({ json })), setHeader } as unknown as NextApiResponse;
  const req = { method, body, query, cookies: {}, headers: {} } as unknown as NextApiRequest;
  return { req, res, json, statusOf: () => (res.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
  mocks.getStaffByUserId.mockResolvedValue(staff('scanner'));
  mocks.doorCurrentOccasion.mockResolvedValue('conference_day');
  mocks.verifyAdminAccess.mockReturnValue({ authorized: false, isBot: false, botClient: null });
});

describe('method guards', () => {
  it.each([
    ['session', sessionHandler, 'POST'],
    ['resolve', resolveHandler, 'GET'],
    ['check-in', checkInHandler, 'GET'],
    ['undo', undoHandler, 'GET'],
    ['manual-admit', manualAdmitHandler, 'GET'],
    ['goodie', goodieHandler, 'GET'],
    ['badge-pickup', badgePickupHandler, 'GET'],
    ['roster', rosterHandler, 'POST'],
  ])('%s rejects the wrong method with 405', async (_name, handler, method) => {
    const { req, res, statusOf } = mockReqRes(method);
    await handler(req, res);
    expect(statusOf()).toBe(405);
  });
});

describe('authentication', () => {
  it('returns 401 when there is no session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { req, res, statusOf, json } = mockReqRes('GET');
    await sessionHandler(req, res);
    expect(statusOf()).toBe(401);
    expect(json.mock.calls[0][0].error).toMatch(/sign in/i);
  });

  it('returns 403 when the user is authenticated but not door staff', async () => {
    mocks.getStaffByUserId.mockResolvedValue(null);
    const { req, res, statusOf, json } = mockReqRes('GET');
    await sessionHandler(req, res);
    expect(statusOf()).toBe(403);
    expect(json.mock.calls[0][0].error).toMatch(/not active door staff/i);
  });

  // Revocation must bite immediately; getStaffByUserId filters on is_active.
  it('treats a revoked volunteer as not staff', async () => {
    mocks.getStaffByUserId.mockResolvedValue(null);
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID });
    await checkInHandler(req, res);
    expect(statusOf()).toBe(403);
    expect(mocks.doorCheckIn).not.toHaveBeenCalled();
  });
});

describe('role matrix', () => {
  it('lets a scanner check in', async () => {
    mocks.doorCheckIn.mockResolvedValue({ outcome: 'applied', occasion: 'conference_day' });
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID });
    await checkInHandler(req, res);
    expect(statusOf()).toBe(200);
  });

  it('refuses a goodie volunteer trying to check someone in', async () => {
    mocks.getStaffByUserId.mockResolvedValue(staff('goodie'));
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID });
    await checkInHandler(req, res);
    expect(statusOf()).toBe(403);
    expect(mocks.doorCheckIn).not.toHaveBeenCalled();
  });

  it('refuses a scanner attempting a manual admission', async () => {
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID, reason: 'blank badge' });
    await manualAdmitHandler(req, res);
    expect(statusOf()).toBe(403);
    expect(mocks.doorCheckIn).not.toHaveBeenCalled();
  });

  it('lets a lead admit manually and marks it as manual', async () => {
    mocks.getStaffByUserId.mockResolvedValue(staff('door_lead'));
    mocks.doorCheckIn.mockResolvedValue({ outcome: 'applied', occasion: 'conference_day' });
    const { req, res, statusOf } = mockReqRes('POST', {
      scannedId: UUID,
      reason: 'Blank badge, phone dead',
    });
    await manualAdmitHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(mocks.doorCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ manual: true, reason: 'Blank badge, phone dead' }),
    );
  });

  it('refuses a scanner recording a goodie handover', async () => {
    const { req, res, statusOf } = mockReqRes('POST', { ticketId: UUID });
    await goodieHandler(req, res);
    expect(statusOf()).toBe(403);
  });

  it('lets a goodie volunteer record a handover', async () => {
    mocks.getStaffByUserId.mockResolvedValue(staff('goodie'));
    mocks.doorGoodieHandover.mockResolvedValue({ outcome: 'applied' });
    const { req, res, statusOf } = mockReqRes('POST', { ticketId: UUID, note: 'hoodie out of stock' });
    await goodieHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(mocks.doorGoodieHandover).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'hoodie out of stock' }),
    );
  });
});

describe('the staff id is never taken from the client', () => {
  // A station that could name its own actor could attribute an action to anyone.
  it('ignores a client-supplied staffId and uses the session identity', async () => {
    mocks.doorCheckIn.mockResolvedValue({ outcome: 'applied' });
    const { req, res } = mockReqRes('POST', { scannedId: UUID, staffId: 'someone-else' });
    await checkInHandler(req, res);
    expect(mocks.doorCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ staffId: 'staff-1' }),
    );
  });
});

describe('the occasion is a validated staff choice', () => {
  it('passes a known occasion through to the function', async () => {
    mocks.doorCheckIn.mockResolvedValue({ outcome: 'applied', occasion: 'workshop_day' });
    const { req, res } = mockReqRes('POST', { scannedId: UUID, occasion: 'workshop_day' });
    await checkInHandler(req, res);
    expect(mocks.doorCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ occasion: 'workshop_day' }),
    );
  });

  // Free text can never reach the audit table: anything outside the enum is a
  // schema failure, not a fallback.
  it('rejects an occasion outside the two known days with 400', async () => {
    const { req, res, statusOf } = mockReqRes('POST', {
      scannedId: UUID,
      occasion: 'community_day',
    });
    await checkInHandler(req, res);
    expect(statusOf()).toBe(400);
    expect(mocks.doorCheckIn).not.toHaveBeenCalled();
  });

  it('omits the occasion when the client sends none, so the server clock decides', async () => {
    mocks.doorCheckIn.mockResolvedValue({ outcome: 'applied' });
    const { req, res } = mockReqRes('POST', { scannedId: UUID });
    await checkInHandler(req, res);
    expect(mocks.doorCheckIn.mock.calls[0][0].occasion).toBeUndefined();
  });
});

describe('undo', () => {
  it('lets a scanner undo a mis-scan at their own lane', async () => {
    mocks.doorCheckInUndo.mockResolvedValue({ outcome: 'applied', occasion: 'conference_day' });
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID });
    await undoHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(mocks.doorCheckInUndo).toHaveBeenCalledWith(
      expect.objectContaining({ staffId: 'staff-1' }),
    );
  });

  it('refuses a goodie volunteer, who cannot check in either', async () => {
    mocks.getStaffByUserId.mockResolvedValue(staff('goodie'));
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID });
    await undoHandler(req, res);
    expect(statusOf()).toBe(403);
    expect(mocks.doorCheckInUndo).not.toHaveBeenCalled();
  });

  // "Nothing to undo" is a fact the volunteer should read, not an error.
  it('returns duplicate as 200 when there was nothing to undo', async () => {
    mocks.doorCheckInUndo.mockResolvedValue({ outcome: 'duplicate' });
    const { req, res, statusOf, json } = mockReqRes('POST', { scannedId: UUID });
    await undoHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0].outcome).toBe('duplicate');
  });
});

describe('badge pickup', () => {
  it('lets every role record a pickup, goodie volunteers included', async () => {
    mocks.getStaffByUserId.mockResolvedValue(staff('goodie'));
    mocks.doorBadgePickup.mockResolvedValue({ outcome: 'applied' });
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID });
    await badgePickupHandler(req, res);
    expect(statusOf()).toBe(200);
  });

  it('reports a second pickup as duplicate with the original time', async () => {
    mocks.doorBadgePickup.mockResolvedValue({
      outcome: 'duplicate',
      alreadyPickedUpAt: '2026-09-09T17:03:00.000Z',
    });
    const { req, res, statusOf, json } = mockReqRes('POST', { scannedId: UUID });
    await badgePickupHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0].alreadyPickedUpAt).toBe('2026-09-09T17:03:00.000Z');
  });
});

describe('goodie handover items', () => {
  it('passes the handed sizes through to the function', async () => {
    mocks.getStaffByUserId.mockResolvedValue(staff('goodie'));
    mocks.doorGoodieHandover.mockResolvedValue({ outcome: 'applied' });
    const { req, res } = mockReqRes('POST', {
      ticketId: UUID,
      tshirtSize: 'M',
      hoodieSize: 'L',
    });
    await goodieHandler(req, res);
    expect(mocks.doorGoodieHandover).toHaveBeenCalledWith(
      expect.objectContaining({ tshirtSize: 'M', hoodieSize: 'L' }),
    );
  });
});

describe('validation', () => {
  it('rejects a non-UUID code with 400 and the issues', async () => {
    const { req, res, statusOf, json } = mockReqRes('POST', { scannedId: 'nope' });
    await resolveHandler(req, res);
    expect(statusOf()).toBe(400);
    expect(json.mock.calls[0][0].issues).toBeDefined();
  });

  it('rejects a manual admission with no reason', async () => {
    mocks.getStaffByUserId.mockResolvedValue(staff('door_lead'));
    const { req, res, statusOf } = mockReqRes('POST', { scannedId: UUID });
    await manualAdmitHandler(req, res);
    expect(statusOf()).toBe(400);
  });
});

describe('outcomes', () => {
  // The station must be able to say "already checked in at 09:14" — an error
  // status would make it indistinguishable from a failure.
  it('returns a duplicate as 200 rather than an error', async () => {
    mocks.doorCheckIn.mockResolvedValue({
      outcome: 'duplicate',
      alreadyCheckedInAt: '2026-09-11T09:14:00.000Z',
    });
    const { req, res, statusOf, json } = mockReqRes('POST', { scannedId: UUID });
    await checkInHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0].outcome).toBe('duplicate');
  });

  it('returns a refusal as 200 with its reason, so the panel can explain it', async () => {
    mocks.doorCheckIn.mockResolvedValue({ outcome: 'denied', failureReason: 'ticket_refunded' });
    const { req, res, statusOf, json } = mockReqRes('POST', { scannedId: UUID });
    await checkInHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0].failureReason).toBe('ticket_refunded');
  });

  // An unknown code is an expected event at a door. A 404 would look like the
  // route was wrong rather than the code being unrecognised.
  it('returns a resolve miss as 200 with found: false', async () => {
    mocks.doorResolve.mockResolvedValue({ found: false, subjectKind: null });
    const { req, res, statusOf, json } = mockReqRes('POST', { scannedId: UUID });
    await resolveHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0].found).toBe(false);
  });

  it('surfaces a database failure as 500 without leaking the message', async () => {
    mocks.doorCheckIn.mockRejectedValue(new Error('relation "tickets" does not exist'));
    const { req, res, statusOf, json } = mockReqRes('POST', { scannedId: UUID });
    await checkInHandler(req, res);
    expect(statusOf()).toBe(500);
    expect(json.mock.calls[0][0].error).not.toMatch(/relation/);
  });
});

describe('roster', () => {
  it('serves the roster for the server-decided occasion', async () => {
    mocks.buildDoorRoster.mockResolvedValue({
      occasion: 'conference_day',
      tickets: [],
      registrations: [],
      workshops: [],
      generatedAt: '2026-09-11T08:00:00.000Z',
    });
    const { req, res, statusOf } = mockReqRes('GET');
    await rosterHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(mocks.buildDoorRoster).toHaveBeenCalledWith('conference_day');
  });

  it('serves the roster for an explicitly chosen day', async () => {
    mocks.buildDoorRoster.mockResolvedValue({
      occasion: 'workshop_day',
      tickets: [],
      registrations: [],
      workshops: [],
      generatedAt: '2026-09-10T06:00:00.000Z',
    });
    const { req, res } = mockReqRes('GET', {}, { occasion: 'workshop_day' });
    await rosterHandler(req, res);
    expect(mocks.buildDoorRoster).toHaveBeenCalledWith('workshop_day');
    expect(mocks.doorCurrentOccasion).not.toHaveBeenCalled();
  });

  it('falls back to the server clock for a nonsense occasion', async () => {
    mocks.buildDoorRoster.mockResolvedValue({
      occasion: 'conference_day',
      tickets: [],
      registrations: [],
      workshops: [],
      generatedAt: '2026-09-11T06:00:00.000Z',
    });
    const { req, res } = mockReqRes('GET', {}, { occasion: 'community_day' });
    await rosterHandler(req, res);
    expect(mocks.buildDoorRoster).toHaveBeenCalledWith('conference_day');
  });

  // The payload is the whole attendee list; a shared cache would serve one
  // volunteer's roster to whoever asked next.
  it('marks the roster private and uncacheable', async () => {
    mocks.buildDoorRoster.mockResolvedValue({
      occasion: 'conference_day', tickets: [], registrations: [], workshops: [],
      generatedAt: '2026-09-11T08:00:00.000Z',
    });
    const { req, res } = mockReqRes('GET');
    await rosterHandler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });
});

describe('session', () => {
  it('returns the staff identity and the server occasion', async () => {
    const { req, res, statusOf, json } = mockReqRes('GET');
    await sessionHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0]).toEqual({
      staff: staff('scanner'),
      occasion: 'conference_day',
    });
  });
});
