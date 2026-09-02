import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockVerifyAdminAccess = vi.fn();
const mockLoadBadgeSources = vi.fn();
const mockRegenerateAllBadgeCodes = vi.fn();
const mockLoadPublicBadgeSpeakers = vi.fn();
const mockServiceClient = {};

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: (...args: unknown[]) => mockVerifyAdminAccess(...args),
}));
vi.mock('@/lib/badges/data', () => ({
  loadBadgeSources: (...args: unknown[]) => mockLoadBadgeSources(...args),
  regenerateAllBadgeCodes: (...args: unknown[]) => mockRegenerateAllBadgeCodes(...args),
}));
vi.mock('@/lib/badges/speakers', () => ({
  loadPublicBadgeSpeakers: (...args: unknown[]) => mockLoadPublicBadgeSpeakers(...args),
}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => mockServiceClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ error: vi.fn() }) },
}));

import handler from '../regenerate';

function request(body: unknown): NextApiRequest {
  return { method: 'POST', body, query: {}, cookies: {} } as unknown as NextApiRequest;
}

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

describe('POST /api/admin/badges/regenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: false });
    mockLoadPublicBadgeSpeakers.mockResolvedValue([{ id: 'public-speaker' }]);
    mockLoadBadgeSources.mockResolvedValue({});
    mockRegenerateAllBadgeCodes.mockResolvedValue(42);
  });

  it('requires explicit confirmation before invalidating existing codes', async () => {
    const res = response();
    await handler(request({ confirmInvalidateExisting: false }), res);

    expect(res.statusCode).toBe(400);
    expect(mockRegenerateAllBadgeCodes).not.toHaveBeenCalled();
  });

  it('provisions missing identifiers and then regenerates every QR code', async () => {
    const res = response();
    await handler(request({ confirmInvalidateExisting: true }), res);

    expect(mockLoadBadgeSources).toHaveBeenCalledWith(
      mockServiceClient,
      [{ id: 'public-speaker' }],
      true
    );
    expect(mockRegenerateAllBadgeCodes).toHaveBeenCalledWith(mockServiceClient);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ regenerated: 42 });
  });

  it('forbids read-only bot credentials', async () => {
    mockVerifyAdminAccess.mockReturnValue({ authorized: true, isBot: true });
    const res = response();
    await handler(request({ confirmInvalidateExisting: true }), res);

    expect(res.statusCode).toBe(401);
    expect(mockRegenerateAllBadgeCodes).not.toHaveBeenCalled();
  });
});
