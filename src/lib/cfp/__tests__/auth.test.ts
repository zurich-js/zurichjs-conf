/**
 * Tests for the CFP session cookie writer and the reviewer invite guard.
 *
 * Both cover regressions in code the door check-in staff flow clones.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parse } from 'cookie';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

// `@/config/env` validates the public env at import time, and this module
// imports it transitively. Populate it before the dynamic import below.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://example.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});

const mocks = vi.hoisted(() => {
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.ilike = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.single = single;
    return { chain, single };
  };
  const { chain, single } = makeChain();
  const mockFrom = vi.fn().mockReturnValue(chain);
  return {
    mockCreateCfpServiceClient: vi.fn().mockReturnValue({ from: mockFrom }),
    mockFrom,
    chain,
    single,
  };
});

vi.mock('@/lib/supabase/cfp-client', () => ({
  createCfpServiceClient: mocks.mockCreateCfpServiceClient,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

const { acceptReviewerInvite, serializeCookies } = await import('../auth');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockCreateCfpServiceClient.mockReturnValue({ from: mocks.mockFrom });
  mocks.mockFrom.mockReturnValue(mocks.chain);
});

describe('serializeCookies', () => {
  // The regression: @supabase/ssr chunks the session cookie into .0/.1 and
  // passes every chunk in one setAll call. Writing them with res.setHeader in
  // a loop kept only the last, silently truncating the session.
  it('returns one Set-Cookie value per chunk so none is lost', () => {
    const out = serializeCookies([
      { name: 'sb-abc-auth-token.0', value: 'part-one' },
      { name: 'sb-abc-auth-token.1', value: 'part-two' },
    ]);

    expect(out).toHaveLength(2);
    expect(parse(out[0])['sb-abc-auth-token.0']).toBe('part-one');
    expect(parse(out[1])['sb-abc-auth-token.1']).toBe('part-two');
  });

  it('honours HttpOnly and Secure from the options the library passes', () => {
    const [value] = serializeCookies([
      { name: 'sb-auth', value: 'v', options: { httpOnly: true, secure: true } },
    ]);

    expect(value).toMatch(/HttpOnly/);
    expect(value).toMatch(/Secure/);
  });

  it('omits HttpOnly and Secure when the library does not ask for them', () => {
    const [value] = serializeCookies([{ name: 'sb-auth', value: 'v', options: {} }]);

    expect(value).not.toMatch(/HttpOnly/);
    expect(value).not.toMatch(/Secure/);
  });

  it('passes through maxAge, path, domain and sameSite', () => {
    const [value] = serializeCookies([
      {
        name: 'sb-auth',
        value: 'v',
        options: { maxAge: 3600, path: '/cfp', domain: 'example.com', sameSite: 'strict' },
      },
    ]);

    expect(value).toMatch(/Max-Age=3600/);
    expect(value).toMatch(/Path=\/cfp/);
    expect(value).toMatch(/Domain=example\.com/);
    expect(value).toMatch(/SameSite=Strict/);
  });

  it('defaults path to / and sameSite to lax when unspecified', () => {
    const [value] = serializeCookies([{ name: 'sb-auth', value: 'v' }]);

    expect(value).toMatch(/Path=\//);
    expect(value).toMatch(/SameSite=Lax/);
  });

  it('encodes values that would otherwise break the header', () => {
    const [value] = serializeCookies([{ name: 'sb-auth', value: 'a;b c' }]);

    expect(parse(value)['sb-auth']).toBe('a;b c');
  });

  it('returns an empty array for no cookies', () => {
    expect(serializeCookies([])).toEqual([]);
  });
});

describe('acceptReviewerInvite', () => {
  const USER = '11111111-1111-4111-8111-111111111111';
  const OTHER_USER = '22222222-2222-4222-8222-222222222222';

  function invite(overrides: Record<string, unknown> = {}) {
    return { id: 'rev-1', email: 'reviewer@example.com', role: 'super_admin', user_id: null, ...overrides };
  }

  it('links an unclaimed invitation to the authenticated user', async () => {
    mocks.chain.single = vi
      .fn()
      .mockResolvedValueOnce({ data: invite(), error: null })
      .mockResolvedValueOnce({ data: invite({ user_id: USER }), error: null });

    const result = await acceptReviewerInvite(USER, 'reviewer@example.com');

    expect(result.error).toBeUndefined();
    expect(result.reviewer?.user_id).toBe(USER);
    expect(mocks.chain.update).toHaveBeenCalled();
  });

  // The regression this guard exists for: without it, claiming a known
  // reviewer's email evicted the legitimate reviewer and inherited their role.
  it('refuses to re-point an invitation another account already holds', async () => {
    mocks.chain.single = vi
      .fn()
      .mockResolvedValueOnce({ data: invite({ user_id: OTHER_USER }), error: null });

    const result = await acceptReviewerInvite(USER, 'reviewer@example.com');

    expect(result.reviewer).toBeNull();
    expect(result.error).toMatch(/already associated with another account/i);
    expect(mocks.chain.update).not.toHaveBeenCalled();
  });

  it('is idempotent when the invitation is already linked to this user', async () => {
    mocks.chain.single = vi
      .fn()
      .mockResolvedValueOnce({ data: invite({ user_id: USER }), error: null });

    const result = await acceptReviewerInvite(USER, 'reviewer@example.com');

    expect(result.reviewer?.user_id).toBe(USER);
    expect(result.error).toBeUndefined();
    expect(mocks.chain.update).not.toHaveBeenCalled();
  });

  it('reports no invitation when the email is not on the allow-list', async () => {
    mocks.chain.single = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'no rows' } });

    const result = await acceptReviewerInvite(USER, 'stranger@example.com');

    expect(result.reviewer).toBeNull();
    expect(result.error).toMatch(/No invitation found/i);
  });
});
