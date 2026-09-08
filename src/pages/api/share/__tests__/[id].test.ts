import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.mock('@/lib/supabase', () => ({ createServiceRoleClient: vi.fn() }));
vi.mock('@/lib/queries/speakers', () => ({ fetchPublicSpeakers: vi.fn() }));

const { resolve, check } = vi.hoisted(() => ({ resolve: vi.fn(), check: vi.fn() }));
vi.mock('@/lib/networking/profiles', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/networking/profiles')>(),
  resolvePublicNetworkingProfile: resolve,
}));
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ check }),
  getClientIp: () => '127.0.0.1',
}));
import handler from '../[id]';

const ID = 'attendee-11111111-2222-4333-8444-555555555555';
const profile = {
  publicId: ID, kind: 'attendee', name: 'Ada Lovelace', headline: 'Engineer @ Example',
  imageUrl: null, links: [{ kind: 'email', label: 'Email', href: 'mailto:public@example.com' }],
  path: `/share/${ID}`,
};
function makeReq(id: string, method = 'GET', host = 'conf.example.test'): NextApiRequest {
  return {
    method,
    query: { id },
    headers: { host },
  } as unknown as NextApiRequest;
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


describe('GET /api/share/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolve.mockResolvedValue(profile);
    check.mockReturnValue({ allowed: true });
  });

  it('returns the public profile without requiring authentication and prevents caching', async () => {
    const res = makeRes();
    await handler(makeReq(ID), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(profile);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(resolve).toHaveBeenCalledWith(ID);
  });

  it('preserves hidden contact details as an empty links array', async () => {
    resolve.mockResolvedValue({ ...profile, links: [] });
    const res = makeRes();
    await handler(makeReq(ID), res);
    expect(res.body).toEqual({ ...profile, links: [] });
  });

  it.each([undefined, ['speaker-ada', 'speaker-bob'], 'invalid', '11111111-2222-4333-8444-555555555555'])(
    'rejects invalid ID %s without resolving data', async (id) => {
      const req = makeReq(ID);
      req.query.id = id;
      const res = makeRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(resolve).not.toHaveBeenCalled();
    }
  );

  it('rejects unsupported methods', async () => {
    const res = makeRes();
    await handler(makeReq(ID, 'POST'), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(resolve).not.toHaveBeenCalled();
  });

  it('returns 404 for unavailable profiles', async () => {
    resolve.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq(ID), res);
    expect(res.statusCode).toBe(404);
  });

  it('rate limits requests before resolving profiles', async () => {
    check.mockReturnValue({ allowed: false, resetAt: Date.now() + 30000 });
    const res = makeRes();
    await handler(makeReq(ID), res);
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBeGreaterThan(0);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('does not expose internal errors', async () => {
    resolve.mockRejectedValue(new Error('private database details'));
    const res = makeRes();
    await handler(makeReq(ID), res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch networking profile' });
  });
});
