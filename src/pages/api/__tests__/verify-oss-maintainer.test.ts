import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  runOssVerification: vi.fn(),
  resolveOssTicketPrice: vi.fn(),
  getOssSeatInfo: vi.fn(),
  insert: vi.fn(),
  sendVerificationRequestEmail: vi.fn(),
  notifyStatusVerification: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock('@/lib/oss', () => ({
  runOssVerification: mocks.runOssVerification,
  resolveOssTicketPrice: mocks.resolveOssTicketPrice,
  getOssSeatInfo: mocks.getOssSeatInfo,
  OSS_TIER_DISCOUNT: { 1: 80, 2: 60, 3: 40, 4: 20 },
  OSS_MAINTAINER_SEAT_CAP: 30,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      insert: mocks.insert,
    }),
  }),
}));

vi.mock('@/lib/email', () => ({
  sendVerificationRequestEmail: mocks.sendVerificationRequestEmail,
}));

vi.mock('@/lib/platform-notifications', () => ({
  notifyStatusVerification: mocks.notifyStatusVerification,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: () => ({
      error: mocks.loggerError,
      info: mocks.loggerInfo,
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import handler from '../verify-oss-maintainer';

interface MockResponse {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  setHeader: (name: string, value: string | number) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    setHeader(name, value) { res._headers[name] = String(value); return res; },
  };
  return res;
}

async function call(req: Partial<NextApiRequest>) {
  const res = createResponse();
  await handler(
    {
      headers: {},
      cookies: {},
      socket: { remoteAddress: '203.0.113.1' },
      ...req,
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

const validBody = {
  name: 'Jane Maintainer',
  email: 'jane@example.com',
  githubUsername: 'janedoe',
  repos: ['janedoe/cool-lib'],
  npmPackages: ['cool-lib'],
  ticketTier: 'standard' as const,
};

describe('/api/verify-oss-maintainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOssSeatInfo.mockResolvedValue({ cap: 30, reserved: 0, remaining: 30, soldOut: false });
    mocks.resolveOssTicketPrice.mockResolvedValue({
      priceId: 'price_standard_123',
      lookupKey: 'standard_early_bird',
      stage: 'early_bird',
      currency: 'CHF',
    });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.sendVerificationRequestEmail.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    // Reset the in-process rate-limiter window by using different IPs across tests
    // (we already vary remoteAddress where needed below).
  });

  it('rejects non-POST', async () => {
    const res = await call({ method: 'GET' });
    expect(res._status).toBe(405);
  });

  it('rejects invalid payload with 400', async () => {
    const res = await call({
      method: 'POST',
      body: { ...validBody, email: 'not-an-email' },
      socket: { remoteAddress: '203.0.113.10' } as never,
    });
    expect(res._status).toBe(400);
  });

  it('rejects honeypot submissions', async () => {
    const res = await call({
      method: 'POST',
      body: { ...validBody, website: 'spammers-r-us' },
      socket: { remoteAddress: '203.0.113.11' } as never,
    });
    expect(res._status).toBe(400);
  });

  it('returns sold-out message when seat cap is reached', async () => {
    mocks.getOssSeatInfo.mockResolvedValueOnce({
      cap: 30, reserved: 30, remaining: 0, soldOut: true,
    });
    const res = await call({
      method: 'POST',
      body: validBody,
      socket: { remoteAddress: '203.0.113.12' } as never,
    });
    expect(res._status).toBe(200);
    expect((res._json as { qualified: boolean }).qualified).toBe(false);
    expect((res._json as { message: string }).message).toMatch(/sold out/i);
  });

  it('surfaces hard reject reasons without storing the request', async () => {
    mocks.runOssVerification.mockResolvedValueOnce({
      qualifyingTier: null,
      hardRejectReason: 'GitHub account is < 2 years old',
      notes: [],
      repos: [],
      npmPackages: [],
      gates: [],
      githubUsername: 'janedoe',
      githubAccountCreatedAt: null,
      githubAccountAgeYears: 1,
      bestRepoTenureYears: null,
      bestRepoStars: 0,
      bestNpmWeeklyDownloads: 0,
      hasRecentActivity: false,
      checkedAt: new Date().toISOString(),
    });

    const res = await call({
      method: 'POST',
      body: validBody,
      socket: { remoteAddress: '203.0.113.13' } as never,
    });
    expect(res._status).toBe(200);
    expect((res._json as { qualified: boolean }).qualified).toBe(false);
    expect((res._json as { hardRejectReason: string }).hardRejectReason).toMatch(/2 years/);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('stores qualifying submissions and notifies admins', async () => {
    mocks.runOssVerification.mockResolvedValueOnce({
      qualifyingTier: 2,
      hardRejectReason: null,
      notes: [],
      repos: [{ owner: 'janedoe', name: 'cool-lib', url: 'https://github.com/janedoe/cool-lib', stars: 5000, isFork: false, forkAheadBy: null, defaultBranch: 'main', firstCommitByUser: '2023-01-01', lastCommitByUser: '2026-04-01', commitsByUser: 300, topContributors: ['janedoe'], isTopContributor: true, isOwner: true, pushedAt: '2026-04-01' }],
      npmPackages: [],
      gates: [],
      githubUsername: 'janedoe',
      githubAccountCreatedAt: '2018-01-01',
      githubAccountAgeYears: 8,
      bestRepoTenureYears: 3,
      bestRepoStars: 5000,
      bestNpmWeeklyDownloads: 0,
      hasRecentActivity: true,
      checkedAt: new Date().toISOString(),
    });

    const res = await call({
      method: 'POST',
      body: validBody,
      socket: { remoteAddress: '203.0.113.14' } as never,
    });
    expect(res._status).toBe(200);
    const json = res._json as {
      success: boolean;
      qualified: boolean;
      qualifyingTier?: number;
      discountPercent?: number;
      verificationId?: string;
    };
    expect(json.success).toBe(true);
    expect(json.qualified).toBe(true);
    expect(json.qualifyingTier).toBe(2);
    expect(json.discountPercent).toBe(60);
    expect(json.verificationId).toMatch(/^VER-/);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.notifyStatusVerification).toHaveBeenCalledWith(
      expect.objectContaining({ statusType: 'oss_maintainer' })
    );
  });

  it('returns 409 when github_username unique constraint is violated', async () => {
    mocks.runOssVerification.mockResolvedValueOnce({
      qualifyingTier: 3,
      hardRejectReason: null,
      notes: [],
      repos: [{ owner: 'janedoe', name: 'cool-lib', url: 'https://github.com/janedoe/cool-lib', stars: 1000, isFork: false, forkAheadBy: null, defaultBranch: 'main', firstCommitByUser: '2024-01-01', lastCommitByUser: '2026-04-01', commitsByUser: 100, topContributors: ['janedoe'], isTopContributor: true, isOwner: true, pushedAt: '2026-04-01' }],
      npmPackages: [],
      gates: [],
      githubUsername: 'janedoe',
      githubAccountCreatedAt: '2020-01-01',
      githubAccountAgeYears: 6,
      bestRepoTenureYears: 2,
      bestRepoStars: 1000,
      bestNpmWeeklyDownloads: 0,
      hasRecentActivity: true,
      checkedAt: new Date().toISOString(),
    });
    mocks.insert.mockResolvedValueOnce({
      error: { code: '23505', message: 'duplicate key', details: null, hint: null },
    });

    const res = await call({
      method: 'POST',
      body: validBody,
      socket: { remoteAddress: '203.0.113.15' } as never,
    });
    expect(res._status).toBe(409);
  });
});
