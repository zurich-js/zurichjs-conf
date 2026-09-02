import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockVerifyAdminAccess = vi.fn();
const mockLoadBadgeSources = vi.fn();
const mockFilterBadgeSources = vi.fn((sources: unknown, _includedIds?: unknown) => sources);
const mockBuildBadgeExportFiles = vi.fn();
const mockCreateZip = vi.fn();
const mockLoadPublicBadgeSpeakers = vi.fn();
const mockServiceClient = {};

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: (...args: unknown[]) => mockVerifyAdminAccess(...args),
}));
vi.mock('@/lib/badges/data', () => ({
  loadBadgeSources: (...args: unknown[]) => mockLoadBadgeSources(...args),
  filterBadgeSources: (sources: unknown, includedIds: unknown) => mockFilterBadgeSources(sources, includedIds),
}));
vi.mock('@/lib/badges/files', () => ({
  buildBadgeExportFiles: (...args: unknown[]) => mockBuildBadgeExportFiles(...args),
}));
vi.mock('@/lib/badges/zip', () => ({
  createZip: (...args: unknown[]) => mockCreateZip(...args),
}));
vi.mock('@/lib/badges/speakers', () => ({
  loadPublicBadgeSpeakers: (...args: unknown[]) => mockLoadPublicBadgeSpeakers(...args),
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => mockServiceClient,
}));
vi.mock('@/lib/badges/url', () => ({
  getBadgeBaseUrl: () => 'https://conf.example.test',
}));
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
    mockLoadPublicBadgeSpeakers.mockResolvedValue([{
      id: 'public-speaker',
      slug: 'public-speaker',
      first_name: 'Public',
      last_name: 'Speaker',
      company: 'ZurichJS',
      job_title: 'Speaker',
    }]);
    mockLoadBadgeSources.mockResolvedValue({ attendees: [], speakers: [], sponsors: [], manual: [] });
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

    const overrideRes = makeRes();
    await handler(makeReq('POST', {
      provisionShareIds: false,
      entryOverrides: {
        'attendee:ticket-vip': {
          firstName: '',
          lastName: 'Lovelace',
          role: 'Programmer',
          company: 'Analytical Engines',
        },
      },
    }), overrideRes);
    expect(overrideRes.statusCode).toBe(400);

    const manualOverrideRes = makeRes();
    await handler(makeReq('POST', {
      provisionShareIds: false,
      entryOverrides: {
        'manual:badge-row': {
          firstName: 'Temporary',
          lastName: 'Sponsor',
          role: 'Representative',
          company: 'Example Sponsor',
        },
      },
    }), manualOverrideRes);
    expect(manualOverrideRes.statusCode).toBe(400);

    const sponsorOverrideRes = makeRes();
    await handler(makeReq('POST', {
      provisionShareIds: false,
      entryOverrides: {
        'sponsor:sponsor-row': {
          firstName: 'Temporary',
          lastName: 'Sponsor',
          role: 'Representative',
          company: 'Example Sponsor',
        },
      },
    }), sponsorOverrideRes);
    expect(sponsorOverrideRes.statusCode).toBe(400);

    const emptyLabelOverrideRes = makeRes();
    await handler(makeReq('POST', {
      provisionShareIds: false,
      labelOverrides: { 'manual:badge-row': '' },
    }), emptyLabelOverrideRes);
    expect(emptyLabelOverrideRes.statusCode).toBe(400);
  });

  it('allows a read-only deployed export for authenticated bots', async () => {
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: true });
    const res = makeRes();

    await handler(makeReq('GET', undefined), res);

    expect(res.statusCode).toBe(200);
    expect(mockLoadBadgeSources).toHaveBeenCalledWith(
      mockServiceClient,
      expect.any(Array),
      false,
      undefined
    );
  });

  it('uses the exact public lineup rows and returns a ZIP download', async () => {
    const res = makeRes();

    await handler(makeReq(), res);

    expect(mockLoadPublicBadgeSpeakers).toHaveBeenCalledTimes(1);
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
      true,
      undefined
    );
    expect(mockBuildBadgeExportFiles).toHaveBeenCalledWith(
      { attendees: [], speakers: [], sponsors: [], manual: [] },
      'https://conf.example.test',
      expect.objectContaining({ csvPath: expect.any(Function) })
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/zip');
    expect(res.headers['Content-Disposition']).toMatch(
      /^attachment; filename="zurichjs-all-badge-data-/
    );
    expect(res.body).toEqual(Buffer.from('zip'));
  });

  it('scopes a tab export and names the archive for that category', async () => {
    const res = makeRes();
    const includedIds = ['attendee:ticket-vip'];
    const entryOverrides = {
      'attendee:ticket-vip': {
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'Lead programmer',
        company: 'Analytical Engines',
      },
    };
    const labelOverrides = { 'speaker:public-speaker': 'Guest Speaker' };

    await handler(makeReq('POST', {
      provisionShareIds: false,
      mode: 'tab-data',
      category: 'vip',
      includedIds,
      entryOverrides,
      labelOverrides,
    }), res);

    expect(mockLoadBadgeSources).toHaveBeenCalledWith(
      mockServiceClient,
      expect.any(Array),
      false,
      includedIds
    );
    expect(mockFilterBadgeSources).toHaveBeenCalledWith(expect.anything(), includedIds);
    expect(mockBuildBadgeExportFiles).toHaveBeenCalledWith(
      expect.anything(),
      'https://conf.example.test',
      expect.objectContaining({
        entryOverrides: new Map(Object.entries(entryOverrides)),
        labelOverrides: new Map(Object.entries(labelOverrides)),
      })
    );
    expect(res.headers['Content-Disposition']).toMatch(
      /^attachment; filename="zurichjs-vip-badge-data-/
    );
  });

  it('returns one PDF per person in a tab-only archive', async () => {
    const pdf = Buffer.from('pdf-only');
    mockBuildBadgeExportFiles.mockResolvedValue([{
      name: 'pdf/vip/ada-lovelace-attendee-ticket-vip.pdf',
      data: pdf,
    }]);
    mockCreateZip.mockReturnValue(Buffer.from('pdf-zip'));
    const res = makeRes();

    await handler(makeReq('POST', {
      provisionShareIds: true,
      mode: 'tab-pdfs',
      category: 'vip',
      includedIds: ['attendee:ticket-vip'],
    }), res);

    expect(mockBuildBadgeExportFiles).toHaveBeenCalledWith(
      expect.anything(),
      'https://conf.example.test',
      expect.objectContaining({ includeDataFiles: false })
    );
    expect(mockCreateZip).toHaveBeenCalledWith([{
      name: 'pdf/vip/ada-lovelace-attendee-ticket-vip.pdf',
      data: pdf,
    }]);
    expect(res.headers['Content-Type']).toBe('application/zip');
    expect(res.headers['Content-Disposition']).toMatch(
      /^attachment; filename="zurichjs-vip-badge-pdfs-.*\.zip"$/
    );
    expect(res.body).toEqual(Buffer.from('pdf-zip'));
  });

  it('returns one bounded PDF response for client-side ZIP assembly', async () => {
    const pdf = Buffer.from('%PDF-single');
    mockBuildBadgeExportFiles.mockResolvedValue([{
      name: 'pdf/attendee/ada-lovelace-attendee-ticket-1.pdf',
      data: pdf,
    }]);
    const res = makeRes();

    await handler(makeReq('POST', {
      provisionShareIds: false,
      mode: 'single-pdf',
      includedIds: ['attendee:ticket-1'],
    }), res);

    expect(mockCreateZip).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/pdf');
    expect(res.headers['Content-Disposition']).toBe(
      'attachment; filename="ada-lovelace-attendee-ticket-1.pdf"'
    );
    expect(res.headers['X-Badge-Archive-Path']).toBe(
      'pdf/attendee/ada-lovelace-attendee-ticket-1.pdf'
    );
    expect(res.body).toEqual(pdf);
  });

  it('requires a category for tab export modes', async () => {
    const res = makeRes();

    await handler(makeReq('POST', {
      provisionShareIds: true,
      mode: 'tab-pdfs',
      includedIds: ['attendee:ticket-vip'],
    }), res);

    expect(res.statusCode).toBe(400);
    expect(mockLoadBadgeSources).not.toHaveBeenCalled();
  });

  it('requires exactly one included ID for a single PDF response', async () => {
    const res = makeRes();

    await handler(makeReq('POST', {
      provisionShareIds: false,
      mode: 'single-pdf',
      includedIds: ['attendee:ticket-1', 'attendee:ticket-2'],
    }), res);

    expect(res.statusCode).toBe(400);
    expect(mockLoadBadgeSources).not.toHaveBeenCalled();
  });

  it('returns a conflict when disabled share IDs must be provisioned', async () => {
    mockLoadBadgeSources.mockRejectedValue(new Error('2 attendee(s) and 1 sponsor(s) need share IDs.'));
    const res = makeRes();

    await handler(makeReq('POST', { provisionShareIds: false }), res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: '2 attendee(s) and 1 sponsor(s) need share IDs.' });
  });
});
