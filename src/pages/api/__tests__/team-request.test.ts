import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  analyticsIdentify: vi.fn(),
  analyticsTrack: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: mocks.sendEmail,
    };
  },
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    identify: mocks.analyticsIdentify,
    track: mocks.analyticsTrack,
  },
}));

vi.mock('@/lib/url', () => ({
  getBaseUrl: vi.fn(() => 'https://conf.test'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      error: mocks.loggerError,
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import handler from '../team-request';

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
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines AG',
    ticketType: 'Standard x 4',
    quantity: 4,
    message: 'Please invoice us.',
  },
};

describe('/api/team-request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test';
    mocks.sendEmail.mockResolvedValue({ data: { id: 'email_123' }, error: null });
    mocks.analyticsIdentify.mockResolvedValue(undefined);
    mocks.analyticsTrack.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('rejects unsupported methods and invalid payloads', async () => {
    expect((await callHandler({ method: 'GET' }))._status).toBe(405);

    const missingFields = await callHandler({ method: 'POST', body: { email: 'ada@example.com' } });
    expect(missingFields._status).toBe(400);
    expect(missingFields._json).toEqual(expect.objectContaining({ error: 'Missing required fields' }));

    const invalidEmail = await callHandler({
      method: 'POST',
      body: { ...validRequest.body, email: 'not-email' },
    });
    expect(invalidEmail._status).toBe(400);
    expect(invalidEmail._json).toEqual(expect.objectContaining({ error: 'Invalid email address' }));
  });

  it('captures the lead and sends both team request emails', async () => {
    const res = await callHandler(validRequest);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(expect.objectContaining({ success: true }));
    expect(mocks.analyticsIdentify).toHaveBeenCalledWith('ada@example.com', {
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      company: 'Analytical Engines AG',
    });
    expect(mocks.analyticsTrack).toHaveBeenCalledWith('form_submitted', 'ada@example.com', {
      form_name: 'team_request',
      form_type: 'other',
      form_success: true,
    });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail.mock.calls[1][0]).toEqual(expect.objectContaining({
      to: 'hello@zurichjs.com',
      subject: 'New Team Package Request - Analytical Engines AG (4 tickets)',
    }));
  });

  it('does not fail the request when analytics or Resend fails', async () => {
    mocks.analyticsTrack.mockRejectedValueOnce(new Error('posthog down'));
    mocks.sendEmail
      .mockRejectedValueOnce(new Error('customer email rejected'))
      .mockResolvedValueOnce({ data: null, error: { message: 'sales email rejected' } });

    const res = await callHandler(validRequest);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(expect.objectContaining({ success: true }));
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Failed to capture team request analytics',
      expect.any(Error)
    );
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Failed to send team request customer confirmation email',
      expect.any(Error)
    );
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Failed to send team request sales notification email',
      { message: 'sales email rejected' }
    );
  });

  it('encodes mailto reply links and escapes user content in email HTML', async () => {
    await callHandler({
      method: 'POST',
      body: {
        ...validRequest.body,
        name: '<Ada>',
        company: 'A\r\nB',
        message: '<script>alert(1)</script>',
      },
    });

    const salesEmail = mocks.sendEmail.mock.calls[1][0];
    expect(salesEmail.subject).toBe('New Team Package Request - A B (4 tickets)');
    expect(salesEmail.html).toContain('&lt;Ada&gt;');
    expect(salesEmail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(salesEmail.html).toContain('mailto:ada%40example.com?subject=Re%3A+Team+Package');
  });
});
