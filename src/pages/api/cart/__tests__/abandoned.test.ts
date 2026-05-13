import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  cancelEmail: vi.fn(),
  renderEmail: vi.fn(),
  analyticsTrack: vi.fn(),
  analyticsFlush: vi.fn(),
  notifyCartAbandonment: vi.fn(),
  supabaseFrom: vi.fn(),
  supabaseSelect: vi.fn(),
  supabaseEq: vi.fn(),
  supabaseDelete: vi.fn(),
  supabaseInsert: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: mocks.sendEmail,
      cancel: mocks.cancelEmail,
    };
  },
}));

vi.mock('@react-email/render', () => ({
  render: mocks.renderEmail,
}));

vi.mock('@/lib/url', () => ({
  getBaseUrl: vi.fn(() => 'https://conf.test'),
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    track: mocks.analyticsTrack,
    flush: mocks.analyticsFlush,
  },
}));

vi.mock('@/lib/platform-notifications', () => ({
  notifyCartAbandonment: mocks.notifyCartAbandonment,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mocks.supabaseFrom,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import handler from '../abandoned';

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

async function callHandler(req: Partial<NextApiRequest>) {
  const res = createResponse();
  await handler(req as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

const validRequest = {
  method: 'POST',
  body: {
    email: 'buyer@example.com',
    firstName: 'Buyer',
    cartItems: [
      { title: 'Standard', quantity: 2, price: 295, currency: 'CHF' },
      { title: 'Workshop: Agentic JS', quantity: 1, price: 180, currency: 'CHF' },
    ],
    cartTotal: 770,
    currency: 'CHF',
    encodedCartState: 'encoded_cart',
  },
};

describe('/api/cart/abandoned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test';
    mocks.renderEmail.mockResolvedValue('<html>email</html>');
    mocks.sendEmail.mockResolvedValue({ data: { id: 'email_new' }, error: null });
    mocks.cancelEmail.mockResolvedValue({});
    mocks.analyticsTrack.mockResolvedValue(undefined);
    mocks.analyticsFlush.mockResolvedValue(undefined);

    mocks.supabaseFrom.mockReturnValue({
      select: mocks.supabaseSelect,
      delete: mocks.supabaseDelete,
      insert: mocks.supabaseInsert,
    });
    mocks.supabaseSelect.mockReturnValue({ eq: mocks.supabaseEq });
    mocks.supabaseEq.mockResolvedValue({ data: [{ resend_email_id: 'email_old' }] });
    mocks.supabaseDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mocks.supabaseInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('rejects invalid requests', async () => {
    expect((await callHandler({ method: 'GET' }))._status).toBe(405);

    const missingCart = await callHandler({ method: 'POST', body: { email: 'buyer@example.com' } });
    expect(missingCart._status).toBe(400);
    expect(missingCart._json).toEqual(expect.objectContaining({ error: 'Email and cart items are required' }));

    const invalidEmail = await callHandler({
      method: 'POST',
      body: { ...validRequest.body, email: 'nope' },
    });
    expect(invalidEmail._status).toBe(400);
    expect(invalidEmail._json).toEqual(expect.objectContaining({ error: 'Invalid email address' }));
  });

  it('schedules recovery email, replaces older scheduled emails, and notifies analytics', async () => {
    const res = await callHandler(validRequest);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(expect.objectContaining({
      success: true,
      emailId: 'email_new',
    }));
    expect(mocks.renderEmail).toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'buyer@example.com',
      html: '<html>email</html>',
      scheduledAt: expect.any(String),
    }));
    expect(mocks.cancelEmail).toHaveBeenCalledWith('email_old');
    expect(mocks.supabaseInsert).toHaveBeenCalledWith(expect.objectContaining({
      email: 'buyer@example.com',
      resend_email_id: 'email_new',
      scheduled_for: expect.any(String),
    }));
    expect(mocks.analyticsTrack).toHaveBeenCalledWith(
      'cart_abandonment_email_scheduled',
      'buyer@example.com',
      expect.objectContaining({
        cart_recovery_url: 'https://conf.test/cart?cart=encoded_cart&utm_source=email&utm_medium=abandonment&utm_campaign=cart_recovery',
        first_name: 'Buyer',
      })
    );
    expect(mocks.notifyCartAbandonment).toHaveBeenCalledWith(expect.objectContaining({
      buyerEmail: 'buyer@example.com',
      itemsSummary: '2x Standard, 1x Workshop: Agentic JS',
      amount: 77000,
    }));
  });

  it('returns a failure when Resend rejects the scheduled recovery email', async () => {
    mocks.sendEmail.mockResolvedValueOnce({ data: null, error: { message: 'invalid scheduled_at' } });

    const res = await callHandler(validRequest);

    expect(res._status).toBe(500);
    expect(res._json).toEqual(expect.objectContaining({
      success: false,
      error: 'invalid scheduled_at',
    }));
    expect(mocks.analyticsTrack).not.toHaveBeenCalled();
    expect(mocks.notifyCartAbandonment).not.toHaveBeenCalled();
  });
});
