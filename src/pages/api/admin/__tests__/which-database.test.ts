/**
 * The endpoint that answers "which database is this deployment on?".
 *
 * The value of it is entirely in being trustworthy, so these check the two
 * things that would make it lie: reporting a ref that is not the one in the URL,
 * and reporting a key source that is not the variable that actually answered.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://prod-ref.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});

const mocks = vi.hoisted(() => ({ verifyAdminAccess: vi.fn() }));
vi.mock('@/lib/admin/auth', () => ({ verifyAdminAccess: mocks.verifyAdminAccess }));

const handler = (await import('../which-database')).default;
const ORIGINAL = { ...process.env };

function call() {
  const json = vi.fn();
  const res = {
    status: vi.fn().mockReturnThis(),
    json,
    setHeader: vi.fn(),
  } as unknown as NextApiResponse;
  handler({ method: 'GET', cookies: {}, headers: {} } as unknown as NextApiRequest, res);
  return { res, body: json.mock.calls[0]?.[0] as Record<string, unknown> };
}

beforeEach(() => {
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true });
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.clearAllMocks();
});

describe('GET /api/admin/which-database', () => {
  it('reports the project ref from the Supabase URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';

    expect(call().body.supabaseProjectRef).toBe('abcdefghijklmnop');
  });

  it('names the variable that actually supplied the service key', () => {
    // This is the crux: the Supabase/Vercel integration writes
    // SUPABASE_SERVICE_ROLE_KEY, so seeing that name proves the integration's
    // values reached the build rather than the project-level production ones.
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'from-the-integration';

    expect(call().body.serviceKeySource).toBe('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('prefers the explicit name when both are present', () => {
    process.env.SUPABASE_SECRET_KEY = 'explicit';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'synced';

    expect(call().body.serviceKeySource).toBe('SUPABASE_SECRET_KEY');
  });

  it('says null rather than guessing when no key is set', () => {
    expect(call().body.serviceKeySource).toBeNull();
  });

  it('never returns a key or any part of one', () => {
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_do_not_leak_me';

    const serialized = JSON.stringify(call().body);
    expect(serialized).not.toContain('do_not_leak_me');
    expect(serialized).not.toContain('sb_secret');
  });

  it('handles a malformed Supabase URL without throwing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not a url';
    expect(() => call()).not.toThrow();
    expect(call().body.supabaseProjectRef).toBeNull();
  });

  it('refuses a non-admin', () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false });

    const { res } = call();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('is never cached', () => {
    const { res } = call();
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });
});
