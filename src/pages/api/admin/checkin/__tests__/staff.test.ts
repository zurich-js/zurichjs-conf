import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://example.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test';
});

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  listStaff: vi.fn(),
  inviteStaff: vi.fn(),
  updateStaff: vi.fn(),
  deactivateAllStaff: vi.fn(),
  sendDoorStaffInvitationEmail: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: mocks.verifyAdminAccess }));
vi.mock('@/lib/checkin/staff', () => ({
  listStaff: mocks.listStaff,
  inviteStaff: mocks.inviteStaff,
  updateStaff: mocks.updateStaff,
  deactivateAllStaff: mocks.deactivateAllStaff,
}));
vi.mock('@/lib/email/door-emails', () => ({
  sendDoorStaffInvitationEmail: mocks.sendDoorStaffInvitationEmail,
}));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

const listHandler = (await import('../staff/index')).default;
const memberHandler = (await import('../staff/[id]')).default;
const teardownHandler = (await import('../staff/deactivate-all')).default;

const STAFF = {
  id: 's1', email: 'v@zurichjs.com', name: 'Vol', role: 'scanner' as const,
  isActive: true, invitedAt: '2026-09-01T00:00:00.000Z', invitedBy: null, acceptedAt: null,
};

function mockReqRes(method: string, body: unknown = {}, query: Record<string, string> = {}) {
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })), setHeader: vi.fn() } as unknown as NextApiResponse;
  const req = { method, body, query, cookies: {}, headers: {} } as unknown as NextApiRequest;
  return { req, res, json, statusOf: () => (res.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false, botClient: null });
  mocks.sendDoorStaffInvitationEmail.mockResolvedValue({ success: true });
});

describe('auth', () => {
  it.each([
    ['list', listHandler, 'GET'],
    ['member', memberHandler, 'PATCH'],
    ['teardown', teardownHandler, 'POST'],
  ])('%s requires admin access', async (_n, handler, method) => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false, isBot: false, botClient: null });
    const { req, res, statusOf } = mockReqRes(method, { role: 'scanner' }, { id: 's1' });
    await handler(req, res);
    expect(statusOf()).toBe(401);
  });
});

describe('invite', () => {
  it('creates the row and sends the invitation', async () => {
    mocks.inviteStaff.mockResolvedValue({ staff: STAFF, error: null });
    const { req, res, statusOf } = mockReqRes('POST', { email: 'v@zurichjs.com', role: 'scanner' });
    await listHandler(req, res);
    expect(statusOf()).toBe(201);
    expect(mocks.sendDoorStaffInvitationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'v@zurichjs.com', role: 'scanner' }),
    );
  });

  it('lowercases the email so it satisfies the table CHECK constraint', async () => {
    mocks.inviteStaff.mockResolvedValue({ staff: STAFF, error: null });
    const { req, res } = mockReqRes('POST', { email: 'MiXeD@ZurichJS.com', role: 'scanner' });
    await listHandler(req, res);
    expect(mocks.inviteStaff).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'mixed@zurichjs.com' }),
    );
  });

  it('defaults to the least privileged role when none is given', async () => {
    mocks.inviteStaff.mockResolvedValue({ staff: STAFF, error: null });
    const { req, res } = mockReqRes('POST', { email: 'v@zurichjs.com' });
    await listHandler(req, res);
    expect(mocks.inviteStaff).toHaveBeenCalledWith(expect.objectContaining({ role: 'scanner' }));
  });

  // The row is the access grant; the email is only how they find the sign-in
  // page. Rolling back would lose the grant over a recoverable failure.
  it('still returns 201 with a warning when the email fails', async () => {
    mocks.inviteStaff.mockResolvedValue({ staff: STAFF, error: null });
    mocks.sendDoorStaffInvitationEmail.mockResolvedValue({ success: false, error: 'rate limited' });
    const { req, res, statusOf, json } = mockReqRes('POST', { email: 'v@zurichjs.com', role: 'scanner' });
    await listHandler(req, res);
    expect(statusOf()).toBe(201);
    expect(json.mock.calls[0][0].warning).toMatch(/did not send/i);
    expect(json.mock.calls[0][0].staff).toEqual(STAFF);
  });

  it('does not send an email when the row could not be created', async () => {
    mocks.inviteStaff.mockResolvedValue({ staff: null, error: 'Someone with this email has already been invited' });
    const { req, res, statusOf } = mockReqRes('POST', { email: 'v@zurichjs.com', role: 'scanner' });
    await listHandler(req, res);
    expect(statusOf()).toBe(400);
    expect(mocks.sendDoorStaffInvitationEmail).not.toHaveBeenCalled();
  });

  it('rejects a role outside the door vocabulary', async () => {
    const { req, res, statusOf } = mockReqRes('POST', { email: 'v@zurichjs.com', role: 'admin' });
    await listHandler(req, res);
    expect(statusOf()).toBe(400);
    expect(mocks.inviteStaff).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('changes a role', async () => {
    mocks.updateStaff.mockResolvedValue({ staff: { ...STAFF, role: 'door_lead' }, error: null });
    const { req, res, statusOf } = mockReqRes('PATCH', { role: 'door_lead' }, { id: 's1' });
    await memberHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(mocks.updateStaff).toHaveBeenCalledWith('s1', { role: 'door_lead' });
  });

  // Revoking must not delete the row: ON DELETE SET NULL would clear the actor
  // reference on every audit event naming them.
  it('revokes by flipping isActive rather than deleting', async () => {
    mocks.updateStaff.mockResolvedValue({ staff: { ...STAFF, isActive: false }, error: null });
    const { req, res, statusOf } = mockReqRes('PATCH', { isActive: false }, { id: 's1' });
    await memberHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(mocks.updateStaff).toHaveBeenCalledWith('s1', { isActive: false });
  });

  it('rejects an empty update rather than issuing a no-op write', async () => {
    const { req, res, statusOf } = mockReqRes('PATCH', {}, { id: 's1' });
    await memberHandler(req, res);
    expect(statusOf()).toBe(400);
    expect(mocks.updateStaff).not.toHaveBeenCalled();
  });

  it('requires a staff id', async () => {
    const { req, res, statusOf } = mockReqRes('PATCH', { role: 'scanner' }, {});
    await memberHandler(req, res);
    expect(statusOf()).toBe(400);
  });
});

describe('teardown', () => {
  it('reports how many were revoked', async () => {
    mocks.deactivateAllStaff.mockResolvedValue({ count: 12, error: null });
    const { req, res, statusOf, json } = mockReqRes('POST');
    await teardownHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0]).toEqual({ deactivated: 12 });
  });

  it('rejects GET so it cannot fire from a link or a prefetch', async () => {
    const { req, res, statusOf } = mockReqRes('GET');
    await teardownHandler(req, res);
    expect(statusOf()).toBe(405);
  });
});

describe('list', () => {
  it('returns the crew', async () => {
    mocks.listStaff.mockResolvedValue([STAFF]);
    const { req, res, statusOf, json } = mockReqRes('GET');
    await listHandler(req, res);
    expect(statusOf()).toBe(200);
    expect(json.mock.calls[0][0]).toEqual({ staff: [STAFF] });
  });
});
