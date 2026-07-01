import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  persistApplication: vi.fn(),
}));

vi.mock('@/lib/email/namespace-student-sponsorship', () => ({
  sendNamespaceStudentSponsorshipEmail: mocks.sendEmail,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      info: mocks.loggerInfo,
      warn: mocks.loggerWarn,
      error: mocks.loggerError,
      debug: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/namespace/student-sponsorship-persistence', () => ({
  persistNamespaceStudentSponsorshipApplication: mocks.persistApplication,
}));

import handler from '../student-sponsorship';

const googleFormFallbackUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLScpq-Orha6BeQ4SCSQ5XSeowrFybb-jg8Q7Xh1oh8hZnxc0-w/viewform';

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

function requestWithIp(ip: string, body = validBody): Partial<NextApiRequest> {
  return {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
      'user-agent': 'vitest',
    },
    body,
  };
}

const validBody = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  universityName: 'University of Zurich',
  degreeName: 'BSc Computer Science',
  githubUrl: 'https://github.com/ada',
  codeUrl: 'https://github.com/ada/project',
  setupInstructions: 'Run pnpm install and pnpm test to execute the project locally.',
  prideExplanation:
    'I built this to understand compiler pipelines and learned how to keep a small parser testable.',
  anythingElse: 'Happy to share more details.',
  eligibilityConfirmed: true,
  processingConsent: true,
  website: '',
};

describe('/api/namespace/student-sponsorship', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T10:00:00.000Z'));
    mocks.sendEmail.mockResolvedValue({ success: true });
    mocks.persistApplication.mockResolvedValue({
      application: {
        id: 'application-1',
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects unsupported methods and invalid payloads', async () => {
    expect((await callHandler({ method: 'GET' }))._status).toBe(405);

    const invalid = await callHandler(requestWithIp('203.0.113.1', {
      ...validBody,
      email: 'not-an-email',
    }));

    expect(invalid._status).toBe(400);
    expect(invalid._json).toEqual(expect.objectContaining({
      success: false,
      fallbackUrl: googleFormFallbackUrl,
      error: 'Enter a valid email address',
    }));
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('silently accepts honeypot submissions without sending email', async () => {
    const res = await callHandler(requestWithIp('203.0.113.2', {
      ...validBody,
      website: 'https://spam.example',
    }));

    expect(res._status).toBe(200);
    expect(res._json).toEqual(expect.objectContaining({ success: true }));
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('sends a validated submission to the challenge inbox', async () => {
    const res = await callHandler(requestWithIp('203.0.113.3'));

    expect(res._status).toBe(200);
    expect(res._json).toEqual(expect.objectContaining({
      success: true,
      fallbackUrl: googleFormFallbackUrl,
    }));
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      codeUrl: 'https://github.com/ada/project',
      submittedAt: expect.any(String),
      userAgent: 'vitest',
    }));
    expect(mocks.persistApplication).toHaveBeenNthCalledWith(1, expect.objectContaining({
      status: 'submission_failed',
    }));
    expect(mocks.persistApplication).toHaveBeenNthCalledWith(2, expect.objectContaining({
      applicationId: 'application-1',
      status: 'email_sent',
    }));
  });

  it('returns fallback guidance without sending email when persistence fails', async () => {
    mocks.persistApplication.mockResolvedValueOnce({
      application: null,
      error: 'database unavailable',
    });

    const res = await callHandler(requestWithIp('203.0.113.33'));

    expect(res._status).toBe(500);
    expect(res._json).toEqual(expect.objectContaining({
      success: false,
      error: 'Failed to save your submission.',
      fallbackUrl: googleFormFallbackUrl,
    }));
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('rate limits repeated submissions from the same IP', async () => {
    for (let index = 0; index < 6; index += 1) {
      expect((await callHandler(requestWithIp('203.0.113.4')))._status).toBe(200);
    }

    const limited = await callHandler(requestWithIp('203.0.113.4'));

    expect(limited._status).toBe(429);
    expect(limited._json).toEqual(expect.objectContaining({
      success: false,
      fallbackUrl: googleFormFallbackUrl,
    }));
  });

  it('rejects submissions after the challenge deadline', async () => {
    vi.setSystemTime(new Date('2026-07-20T10:00:00.000Z'));

    const res = await callHandler(requestWithIp('203.0.113.5'));

    expect(res._status).toBe(403);
    expect(res._json).toEqual(expect.objectContaining({
      success: false,
      error: 'The Namespace Student Sponsorship challenge is closed.',
    }));
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns fallback guidance when email sending fails', async () => {
    mocks.sendEmail.mockResolvedValueOnce({ success: false, error: 'resend down' });

    const res = await callHandler(requestWithIp('203.0.113.6'));

    expect(res._status).toBe(500);
    expect(res._json).toEqual(expect.objectContaining({
      success: false,
      fallbackUrl: googleFormFallbackUrl,
    }));
    expect(mocks.persistApplication).toHaveBeenCalledTimes(1);
    expect(mocks.persistApplication).toHaveBeenCalledWith(expect.objectContaining({
      status: 'submission_failed',
    }));
  });
});
