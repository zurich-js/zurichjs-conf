import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockVerifyAdminAccess = vi.fn();
const mockLoadBadgeSources = vi.fn();
const mockBuildBadgeExportFiles = vi.fn();
const mockCreateZip = vi.fn();
const mockGetVisibleSpeakers = vi.fn();
const mockServiceClient = {};

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: (...args: unknown[]) => mockVerifyAdminAccess(...args),
}));
vi.mock('@/lib/badges/data', () => ({
  loadBadgeSources: (...args: unknown[]) => mockLoadBadgeSources(...args),
}));
vi.mock('@/lib/badges/files', () => ({
  buildBadgeExportFiles: (...args: unknown[]) => mockBuildBadgeExportFiles(...args),
}));
vi.mock('@/lib/badges/zip', () => ({
  createZip: (...args: unknown[]) => mockCreateZip(...args),
}));
vi.mock('@/lib/cfp/speakers', () => ({
  getVisibleSpeakersForOg: (...args: unknown[]) => mockGetVisibleSpeakers(...args),
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => mockServiceClient,
}));
vi.mock('@/lib/url', () => ({ getBaseUrl: () => 'https://conf.example.test' }));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ warn: vi.fn(), error: vi.fn() }) },
}));

import handler from '../export';

function makeReq(method = 'POST', body: unknown = { provisionShareIds: true }): NextApiRequest {
  return { method, body, query: {}, cookies: {} } as unknown as NextApiRequest;
}

function makeRes(): NextApiResponse & {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
} {
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response as typeof response & NextApiResponse;
}

describe('POST /api/admin/badges/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: false });
    mockGetVisibleSpeakers.mockResolvedValue([{
      slug: 'public-speaker',
      first_name: 'Public',
      last_name: 'Speaker',
      company: 'ZurichJS',
      job_title: 'Speaker',
    }]);
    mockLoadBadgeSources.mockResolvedValue({ attendees: [], speakers: [], sponsors: [] });
    mockBuildBadgeExportFiles.mockResolvedValue([{ name: 'badges.csv', data: Buffer.from('csv') }]);
    mockCreateZip.mockReturnValue(Buffer.from('zip'));
  });

  it('requires a human admin session for provisioning', async () => {
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: true });
    const res = makeRes();

    await handler(makeReq(), res);

    expect(res.statusCode).toBe(401);
    expect(mockLoadBadgeSources).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods and invalid bodies', async () => {
    const methodRes = makeRes();
    await handler(makeReq('DELETE'), methodRes);
    expect(methodRes.statusCode).toBe(405);
    expect(methodRes.headers.Allow).toBe('GET, POST');

    const bodyRes = makeRes();
    await handler(makeReq('POST', { provisionShareIds: 'yes' }), bodyRes);
    expect(bodyRes.statusCode).toBe(400);
  });

  it('allows a read-only deployed export for authenticated bots', async () => {
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: true });
    const res = makeRes();

    await handler(makeReq('GET', undefined), res);

    expect(res.statusCode).toBe(200);
    expect(mockLoadBadgeSources).toHaveBeenCalledWith(mockServiceClient, expect.any(Array), false);
  });

  it('uses the exact public lineup rows and returns a ZIP download', async () => {
    const res = makeRes();

    await handler(makeReq(), res);

    expect(mockGetVisibleSpeakers).toHaveBeenCalledTimes(1);
    expect(mockLoadBadgeSources).toHaveBeenCalledWith(
      mockServiceClient,
      [{
        id: 'public-speaker',
        slug: 'public-speaker',
        first_name: 'Public',
        last_name: 'Speaker',
        company: 'ZurichJS',
        job_title: 'Speaker',
      }],
      true
    );
    expect(mockBuildBadgeExportFiles).toHaveBeenCalledWith(
      { attendees: [], speakers: [], sponsors: [] },
      'https://conf.example.test',
      expect.objectContaining({ csvPath: expect.any(Function) })
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/zip');
    expect(res.headers['Content-Disposition']).toMatch(/^attachment; filename="zurichjs-badges-/);
    expect(res.body).toEqual(Buffer.from('zip'));
  });

  it('returns a conflict when disabled share IDs must be provisioned', async () => {
    mockLoadBadgeSources.mockRejectedValue(new Error('2 attendee(s) and 1 sponsor(s) need share IDs.'));
    const res = makeRes();

    await handler(makeReq('POST', { provisionShareIds: false }), res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: '2 attendee(s) and 1 sponsor(s) need share IDs.' });
  });
});
