import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

interface WorkshopRow {
  id: string;
  title: string;
  status: string;
}

const mocks = vi.hoisted(() => {
  const lookupResult: { data: WorkshopRow | null; error: { message: string } | null } = {
    data: null,
    error: null,
  };
  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    maybeSingle: vi.fn(async () => ({ data: lookupResult.data, error: lookupResult.error })),
  };

  return {
    addWorkshopWaitlistContact: vi.fn(),
    sendWorkshopWaitlistConfirmationEmail: vi.fn(),
    notifyWorkshopWaitlist: vi.fn(),
    analyticsError: vi.fn(),
    analyticsFlush: vi.fn(),
    loggerError: vi.fn(),
    lookupResult,
    queryBuilder,
    supabaseFrom: vi.fn(() => queryBuilder),
  };
});

vi.mock('@/lib/email', () => ({
  addWorkshopWaitlistContact: mocks.addWorkshopWaitlistContact,
  sendWorkshopWaitlistConfirmationEmail: mocks.sendWorkshopWaitlistConfirmationEmail,
}));

vi.mock('@/lib/platform-notifications/send', () => ({
  notifyWorkshopWaitlist: mocks.notifyWorkshopWaitlist,
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    error: mocks.analyticsError,
    flush: mocks.analyticsFlush,
  },
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({ from: mocks.supabaseFrom })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      error: mocks.loggerError,
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import handler from '../waitlist';

const WORKSHOP_ID = '11111111-1111-4111-8111-111111111111';

interface MockResponse {
  _status: number;
  _json: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

async function callHandler(body: unknown, method = 'POST') {
  const res = createResponse();
  await handler({ method, body } as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

describe('POST /api/workshops/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lookupResult.data = { id: WORKSHOP_ID, title: 'Testing at Scale', status: 'published' };
    mocks.lookupResult.error = null;
    mocks.addWorkshopWaitlistContact.mockResolvedValue({ success: true });
    mocks.sendWorkshopWaitlistConfirmationEmail.mockResolvedValue({ success: true });
    mocks.analyticsFlush.mockResolvedValue(undefined);
  });

  it('rejects non-POST methods', async () => {
    const res = await callHandler({}, 'GET');

    expect(res._status).toBe(405);
    expect(mocks.addWorkshopWaitlistContact).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const res = await callHandler({ email: 'not-an-email', workshopId: WORKSHOP_ID });

    expect(res._status).toBe(400);
    expect(res._json).toEqual({
      success: false,
      error: 'Please enter a valid email address',
    });
    expect(mocks.addWorkshopWaitlistContact).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid workshop id', async () => {
    const res = await callHandler({ email: 'ada@example.com', workshopId: 'nope' });

    expect(res._status).toBe(400);
    expect(mocks.addWorkshopWaitlistContact).not.toHaveBeenCalled();
  });

  it('404s when the workshop does not exist', async () => {
    mocks.lookupResult.data = null;

    const res = await callHandler({ email: 'ada@example.com', workshopId: WORKSHOP_ID });

    expect(res._status).toBe(404);
    expect(mocks.addWorkshopWaitlistContact).not.toHaveBeenCalled();
  });

  it('404s when the workshop is not published', async () => {
    mocks.lookupResult.data = { id: WORKSHOP_ID, title: 'Draft Workshop', status: 'draft' };

    const res = await callHandler({ email: 'ada@example.com', workshopId: WORKSHOP_ID });

    expect(res._status).toBe(404);
    expect(mocks.addWorkshopWaitlistContact).not.toHaveBeenCalled();
  });

  it('500s when the workshop lookup fails', async () => {
    mocks.lookupResult.error = { message: 'connection reset' };

    const res = await callHandler({ email: 'ada@example.com', workshopId: WORKSHOP_ID });

    expect(res._status).toBe(500);
    expect(mocks.loggerError).toHaveBeenCalled();
    expect(mocks.addWorkshopWaitlistContact).not.toHaveBeenCalled();
  });

  it('adds the contact, notifies Slack and sends the confirmation email', async () => {
    const res = await callHandler({ email: 'ada@example.com', workshopId: WORKSHOP_ID });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      success: true,
      message: 'Successfully joined the workshop waitlist',
    });
    expect(mocks.addWorkshopWaitlistContact).toHaveBeenCalledWith('ada@example.com');
    expect(mocks.notifyWorkshopWaitlist).toHaveBeenCalledWith({
      email: 'ada@example.com',
      workshopId: WORKSHOP_ID,
      workshopTitle: 'Testing at Scale',
    });
    expect(mocks.sendWorkshopWaitlistConfirmationEmail).toHaveBeenCalledWith(
      'ada@example.com',
      'Testing at Scale'
    );
  });

  it('uses the server-side title, ignoring any client-supplied one', async () => {
    await callHandler({
      email: 'ada@example.com',
      workshopId: WORKSHOP_ID,
      workshopTitle: 'Spoofed Title',
    });

    expect(mocks.sendWorkshopWaitlistConfirmationEmail).toHaveBeenCalledWith(
      'ada@example.com',
      'Testing at Scale'
    );
  });

  it('500s when the Resend contact cannot be created', async () => {
    mocks.addWorkshopWaitlistContact.mockResolvedValue({
      success: false,
      error: 'Resend unavailable',
    });

    const res = await callHandler({ email: 'ada@example.com', workshopId: WORKSHOP_ID });

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ success: false, error: 'Resend unavailable' });
    expect(mocks.notifyWorkshopWaitlist).not.toHaveBeenCalled();
    expect(mocks.sendWorkshopWaitlistConfirmationEmail).not.toHaveBeenCalled();
  });

  it('still succeeds when the confirmation email fails', async () => {
    mocks.sendWorkshopWaitlistConfirmationEmail.mockResolvedValue({
      success: false,
      error: 'mailbox full',
    });

    const res = await callHandler({ email: 'ada@example.com', workshopId: WORKSHOP_ID });

    expect(res._status).toBe(200);
    expect(mocks.notifyWorkshopWaitlist).toHaveBeenCalled();
  });
});
