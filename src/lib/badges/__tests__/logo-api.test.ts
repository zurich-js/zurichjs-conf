import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  parse: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  metadata: vi.fn(),
  maybeSingle: vi.fn(),
  updateEq: vi.fn(),
  upload: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: (...args: unknown[]) => mocks.verifyAdminAccess(...args),
}));
vi.mock('formidable', () => ({
  default: () => ({ parse: (...args: unknown[]) => mocks.parse(...args) }),
}));
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: (...args: unknown[]) => mocks.readFile(...args),
    unlink: (...args: unknown[]) => mocks.unlink(...args),
  },
}));
vi.mock('sharp', () => ({
  default: () => ({ metadata: () => mocks.metadata() }),
}));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ error: vi.fn() }) },
}));

const storage = {
  upload: (...args: unknown[]) => mocks.upload(...args),
  list: (...args: unknown[]) => mocks.list(...args),
  remove: (...args: unknown[]) => mocks.remove(...args),
  getPublicUrl: (...args: unknown[]) => mocks.getPublicUrl(...args),
};
const client = {
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: () => mocks.maybeSingle() }) }),
    update: (values: unknown) => ({ eq: (...args: unknown[]) => mocks.updateEq(values, ...args) }),
  }),
  storage: { from: () => storage },
};

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => client,
}));

import handler from '@/pages/api/admin/badges/[id]/logo';

const BADGE_ID = '11111111-2222-4333-8444-555555555555';

function makeReq(method = 'POST'): NextApiRequest {
  return {
    method,
    query: { id: BADGE_ID },
    cookies: {},
  } as unknown as NextApiRequest;
}

function makeRes(): NextApiResponse & {
  statusCode: number;
  body: unknown;
} {
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
  return response as typeof response & NextApiResponse;
}

describe('POST /api/admin/badges/:id/logo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: BADGE_ID, category: 'sponsor' },
      error: null,
    });
    mocks.parse.mockResolvedValue([{}, {
      file: [{ mimetype: 'image/svg+xml', filepath: '/tmp/sponsor-logo.svg' }],
    }]);
    mocks.readFile.mockResolvedValue(Buffer.from('<svg/>'));
    mocks.unlink.mockResolvedValue(undefined);
    mocks.metadata.mockResolvedValue({ width: 900 });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.list.mockResolvedValue({ data: [], error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://assets.example.test/badge-logo.svg' },
    });
  });

  it('requires a human admin', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: true });
    const res = makeRes();

    await handler(makeReq(), res);

    expect(res.statusCode).toBe(401);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it('only accepts manual sponsor badge rows', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { id: BADGE_ID, category: 'organizer' },
      error: null,
    });
    const res = makeRes();

    await handler(makeReq(), res);

    expect(res.statusCode).toBe(404);
    expect(mocks.parse).not.toHaveBeenCalled();
  });

  it('stores the default logo and persists its public URL', async () => {
    const res = makeRes();

    await handler(makeReq(), res);

    expect(res.statusCode).toBe(200);
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^badge-logos\/11111111-2222-4333-8444-555555555555\/default_\d+\.svg$/),
      Buffer.from('<svg/>'),
      { contentType: 'application/octet-stream', upsert: false }
    );
    expect(mocks.updateEq).toHaveBeenCalledWith(
      { logo_url: expect.stringContaining('https://assets.example.test/badge-logo.svg?v=') },
      'id',
      BADGE_ID
    );
    expect(res.body).toMatchObject({ width: 900, warning: null });
    expect(mocks.unlink).toHaveBeenCalledWith('/tmp/sponsor-logo.svg');
  });
});
