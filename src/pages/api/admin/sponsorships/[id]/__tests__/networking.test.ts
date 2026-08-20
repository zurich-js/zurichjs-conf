import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  createServiceRoleClient: vi.fn(),
  from: vi.fn(),
  sponsorSelect: vi.fn(),
  sponsorIdEq: vi.fn(),
  sponsorMaybeSingle: vi.fn(),
  select: vi.fn(),
  sponsorEq: vi.fn(),
  subjectEq: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
  upsertSelect: vi.fn(),
  single: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: mocks.verifyAdminAccess,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: mocks.loggerError,
    })),
  },
}));

import handler from '../networking';

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  setHeader: (name: string, value: unknown) => MockResponse;
}

function createResponse(): MockResponse {
  const response: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(body) {
      response.body = body;
      return response;
    },
    setHeader(name, value) {
      response.headers[name] = value;
      return response;
    },
  };
  return response;
}

async function callHandler(request: Partial<NextApiRequest>): Promise<MockResponse> {
  const response = createResponse();
  await handler(request as NextApiRequest, response as unknown as NextApiResponse);
  return response;
}

const SPONSOR_ID = '591eca55-d1e1-480a-a2ee-8e8583b81e9b';
const SHARE_ID = '49dc901a-1884-4a3b-8d5c-17b711420f6e';

const explicitProfile = {
  contactName: 'Partnerships team',
  email: 'partners@example.com',
  phone: null,
  websiteUrl: 'https://example.com',
  linkedinUrl: null,
  preferredMethod: 'email' as const,
};

function validBody() {
  return {
    enabled: true,
    profile: {
      contactName: ' Partnerships team ',
      email: 'Partners@Example.com',
      phone: '',
      websiteUrl: 'example.com',
      linkedinUrl: '',
      preferredMethod: 'email',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyAdminAccess.mockReturnValue({
    authorized: true,
    isBot: false,
    botClient: null,
  });
  mocks.createServiceRoleClient.mockReturnValue({ from: mocks.from });
  mocks.from.mockImplementation((table: string) =>
    table === 'sponsors'
      ? { select: mocks.sponsorSelect }
      : { select: mocks.select, upsert: mocks.upsert }
  );
  mocks.sponsorSelect.mockReturnValue({ eq: mocks.sponsorIdEq });
  mocks.sponsorIdEq.mockReturnValue({ maybeSingle: mocks.sponsorMaybeSingle });
  mocks.sponsorMaybeSingle.mockResolvedValue({ data: { id: SPONSOR_ID }, error: null });
  mocks.select.mockReturnValue({ eq: mocks.sponsorEq });
  mocks.sponsorEq.mockReturnValue({ eq: mocks.subjectEq });
  mocks.subjectEq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.upsert.mockReturnValue({ select: mocks.upsertSelect });
  mocks.upsertSelect.mockReturnValue({ single: mocks.single });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.single.mockResolvedValue({
    data: { share_id: SHARE_ID, enabled: true, profile: explicitProfile },
    error: null,
  });
});

describe('/api/admin/sponsorships/[id]/networking', () => {
  it('rejects unauthorized requests before touching the database', async () => {
    mocks.verifyAdminAccess.mockReturnValue({
      authorized: false,
      isBot: false,
      botClient: null,
    });

    const response = await callHandler({
      method: 'GET',
      query: { id: SPONSOR_ID },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers['Cache-Control']).toBe('private, no-store, max-age=0');
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('returns a disabled empty default without creating a profile', async () => {
    const response = await callHandler({
      method: 'GET',
      query: { id: SPONSOR_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      shareId: null,
      enabled: false,
      profile: {
        contactName: null,
        email: null,
        phone: null,
        websiteUrl: null,
        linkedinUrl: null,
        preferredMethod: null,
      },
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenNthCalledWith(1, 'sponsors');
    expect(mocks.sponsorSelect).toHaveBeenCalledWith('id');
    expect(mocks.from).toHaveBeenNthCalledWith(2, 'networking_profiles');
    expect(mocks.select).toHaveBeenCalledWith('share_id, enabled, profile');
  });

  it('returns 404 for a nonexistent sponsor without reading networking data', async () => {
    mocks.sponsorMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await callHandler({
      method: 'GET',
      query: { id: SPONSOR_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Sponsor not found' });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('returns only explicitly configured public contact data', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        share_id: SHARE_ID,
        enabled: true,
        profile: explicitProfile,
        contact_email: 'billing-private@example.com',
        contact_phone: '+41 private',
      },
      error: null,
    });

    const response = await callHandler({
      method: 'GET',
      query: { id: SPONSOR_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      shareId: SHARE_ID,
      enabled: true,
      profile: explicitProfile,
    });
    expect(JSON.stringify(response.body)).not.toContain('billing-private@example.com');
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(mocks.sponsorSelect).toHaveBeenCalledWith('id');
  });

  it('rejects invalid PUT data before attempting an upsert', async () => {
    const response = await callHandler({
      method: 'PUT',
      query: { id: SPONSOR_ID },
      body: {
        enabled: true,
        profile: { ...validBody().profile, email: 'not-an-email' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ error: 'Validation failed' });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('upserts validated settings without replacing the existing share ID', async () => {
    const response = await callHandler({
      method: 'PUT',
      query: { id: SPONSOR_ID },
      body: validBody(),
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      shareId: SHARE_ID,
      enabled: true,
      profile: explicitProfile,
    });
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        subject_type: 'sponsor',
        sponsor_id: SPONSOR_ID,
        enabled: true,
        profile: explicitProfile,
      },
      { onConflict: 'sponsor_id' }
    );
    const upserted = mocks.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(upserted).not.toHaveProperty('share_id');
    expect(upserted).not.toHaveProperty('contact_email');
    expect(upserted).not.toHaveProperty('contact_phone');
  });

  it('rejects unsupported methods without creating a service-role client', async () => {
    const response = await callHandler({
      method: 'POST',
      query: { id: SPONSOR_ID },
    });

    expect(response.statusCode).toBe(405);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('catches unexpected database client failures', async () => {
    mocks.createServiceRoleClient.mockImplementation(() => {
      throw new Error('Client unavailable');
    });

    const response = await callHandler({
      method: 'GET',
      query: { id: SPONSOR_ID },
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
    expect(mocks.loggerError).toHaveBeenCalled();
  });
});
