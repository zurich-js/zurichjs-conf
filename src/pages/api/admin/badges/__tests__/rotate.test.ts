import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockVerifyAdminAccess = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: (...args: unknown[]) => mockVerifyAdminAccess(...args),
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: () => {
      const builder = {
        update: (value: unknown) => {
          mockUpdate(value);
          return builder;
        },
        eq: () => builder,
        select: () => builder,
        maybeSingle: mockMaybeSingle,
      };
      return builder;
    },
  }),
}));
vi.mock('@/lib/logger', () => ({ logger: { scope: () => ({ error: vi.fn() }) } }));

import handler from '../rotate';

function response(): NextApiResponse & { statusCode: number; body: unknown } {
  const result = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return result as typeof result & NextApiResponse;
}

function request(body: unknown): NextApiRequest {
  return { method: 'POST', body, query: {}, cookies: {} } as unknown as NextApiRequest;
}

describe('POST /api/admin/badges/rotate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: false });
    mockMaybeSingle.mockResolvedValue({
      data: { code: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      error: null,
    });
  });

  it('requires an explicit not-printed confirmation', async () => {
    const res = response();
    await handler(request({ selectionId: 'speaker:ada-lovelace', confirmNotPrinted: false }), res);
    expect(res.statusCode).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('generates a replacement token without changing the share target', async () => {
    const res = response();
    await handler(request({ selectionId: 'speaker:ada-lovelace', confirmNotPrinted: true }), res);

    expect(res.statusCode).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ code: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  });

  it('forbids read-only bot credentials', async () => {
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: true });
    const res = response();
    await handler(request({ selectionId: 'speaker:ada-lovelace', confirmNotPrinted: true }), res);
    expect(res.statusCode).toBe(401);
  });
});
