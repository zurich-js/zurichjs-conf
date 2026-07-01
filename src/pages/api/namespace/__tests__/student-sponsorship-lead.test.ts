import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  identify: vi.fn(),
  track: vi.fn(),
  flush: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  persistApplication: vi.fn(),
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    identify: mocks.identify,
    track: mocks.track,
    flush: mocks.flush,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      warn: mocks.loggerWarn,
      error: mocks.loggerError,
      info: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/namespace/student-sponsorship-persistence', () => ({
  persistNamespaceStudentSponsorshipApplication: mocks.persistApplication,
}));

import handler from '../student-sponsorship-lead';

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

function requestWithIp(
  ip: string,
  body: unknown = { email: 'ada@example.com', processingConsent: true }
) {
  return {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
    },
    body,
  } satisfies Partial<NextApiRequest>;
}

describe('/api/namespace/student-sponsorship-lead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.persistApplication.mockResolvedValue({
      application: {
        id: 'application-1',
      },
    });
  });

  it('rejects unsupported methods and invalid emails', async () => {
    expect((await callHandler({ method: 'GET' }))._status).toBe(405);

    const invalid = await callHandler(requestWithIp('203.0.113.21', {
      email: 'not-an-email',
    }));

    expect(invalid._status).toBe(400);
    expect(invalid._json).toEqual(expect.objectContaining({
      success: false,
      error: 'Enter a valid email address',
    }));
    expect(mocks.identify).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('identifies and tracks a valid email lead', async () => {
    const res = await callHandler(requestWithIp('203.0.113.22', {
      email: ' Ada@Example.com ',
      processingConsent: true,
      posthogSessionId: 'session-123',
      posthogDistinctId: 'distinct-123',
    }));

    expect(res._status).toBe(200);
    expect(res._json).toEqual(expect.objectContaining({
      success: true,
      applicationId: 'application-1',
    }));
    expect(mocks.persistApplication).toHaveBeenCalledWith(expect.objectContaining({
      email: 'ada@example.com',
      processingConsent: true,
      status: 'partial',
    }));
    expect(mocks.identify).toHaveBeenCalledWith('ada@example.com', expect.objectContaining({
      email: 'ada@example.com',
      namespace_student_sponsorship_lead: true,
      posthog_session_id: 'session-123',
      posthog_distinct_id: 'distinct-123',
    }));
    expect(mocks.track).toHaveBeenCalledWith(
      'namespace_student_sponsorship_email_captured',
      'ada@example.com',
      expect.objectContaining({
        email: 'ada@example.com',
        form_name: 'namespace_student_sponsorship',
        capture_source: 'email_blur',
      })
    );
    expect(mocks.flush).toHaveBeenCalled();
  });

  it('rate limits repeated lead captures from the same IP', async () => {
    for (let index = 0; index < 20; index += 1) {
      expect((await callHandler(requestWithIp('203.0.113.23')))._status).toBe(200);
    }

    const limited = await callHandler(requestWithIp('203.0.113.23'));

    expect(limited._status).toBe(429);
    expect(limited._json).toEqual(expect.objectContaining({
      success: false,
      remaining: 0,
    }));
  });
});
