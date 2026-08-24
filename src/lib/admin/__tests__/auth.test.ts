import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextApiRequest } from 'next';
import {
  ADMIN_SESSION_TTL_SECONDS,
  generateAdminToken,
  verifyAdminAccess,
  verifyAdminPassword,
  verifyAdminToken,
} from '../auth';

const SECRET = 'test-secret-value';

function req(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'GET',
    cookies: {},
    headers: {},
    url: '/api/admin/test',
    ...overrides,
  } as NextApiRequest;
}

beforeEach(() => {
  vi.stubEnv('ORDER_TOKEN_SECRET', SECRET);
  vi.stubEnv('NEXTAUTH_SECRET', '');
  vi.stubEnv('ADMIN_PASSWORD', 'correct-horse');
  vi.stubEnv('ADMIN_READONLY_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('verifyAdminToken — forgery', () => {
  // The regression this file exists for: the previous implementation accepted
  // any base64 string decoding to something starting with "admin:".
  it('rejects the historical forgery admin_token=YWRtaW46', () => {
    expect(verifyAdminToken(Buffer.from('admin:').toString('base64'))).toBe(false);
  });

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['unsigned legacy shape', Buffer.from('admin:1:0.5').toString('base64')],
    ['too few segments', 'v1.123'],
    ['too many segments', 'v1.123.sig.extra'],
    ['wrong version', `v2.${Date.now() + 1000}.sig`],
    ['non-numeric expiry', 'v1.abc.sig'],
    ['whitespace-padded expiry', `v1. ${Date.now() + 1000}.sig`],
    ['signed expiry', `v1.+${Date.now() + 1000}.sig`],
    ['exponent expiry', 'v1.1e20.sig'],
    ['garbage', 'not-a-token'],
  ])('rejects %s', (_label, token) => {
    expect(verifyAdminToken(token as string | undefined)).toBe(false);
  });

  it('rejects a token whose signature was minted with a different secret', () => {
    const token = generateAdminToken();
    vi.stubEnv('ORDER_TOKEN_SECRET', 'a-different-secret');
    expect(verifyAdminToken(token)).toBe(false);
  });

  it('rejects a token whose expiry was tampered with to extend it', () => {
    const token = generateAdminToken();
    const [version, expiresAt, signature] = token.split('.');
    const extended = `${version}.${Number(expiresAt) + 60_000}.${signature}`;
    expect(verifyAdminToken(extended)).toBe(false);
  });

  it('fails closed when no signing secret is configured', () => {
    const token = generateAdminToken();
    vi.stubEnv('ORDER_TOKEN_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');
    expect(verifyAdminToken(token)).toBe(false);
  });
});

describe('verifyAdminToken — lifetime', () => {
  it('accepts a freshly minted token', () => {
    expect(verifyAdminToken(generateAdminToken())).toBe(true);
  });

  it('accepts a token just before it expires', () => {
    vi.useFakeTimers();
    const token = generateAdminToken();
    vi.advanceTimersByTime(ADMIN_SESSION_TTL_SECONDS * 1000 - 1000);
    expect(verifyAdminToken(token)).toBe(true);
  });

  it('rejects a token once its expiry has passed', () => {
    vi.useFakeTimers();
    const token = generateAdminToken();
    vi.advanceTimersByTime(ADMIN_SESSION_TTL_SECONDS * 1000 + 1000);
    expect(verifyAdminToken(token)).toBe(false);
  });

  it('falls back to NEXTAUTH_SECRET when ORDER_TOKEN_SECRET is absent', () => {
    vi.stubEnv('ORDER_TOKEN_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', 'fallback-secret');
    expect(verifyAdminToken(generateAdminToken())).toBe(true);
  });
});

describe('generateAdminToken', () => {
  it('throws rather than minting an unverifiable token when misconfigured', () => {
    vi.stubEnv('ORDER_TOKEN_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');
    expect(() => generateAdminToken()).toThrow(/ORDER_TOKEN_SECRET or NEXTAUTH_SECRET/);
  });

  it('does not leak the signing secret into the token', () => {
    expect(generateAdminToken()).not.toContain(SECRET);
  });
});

describe('verifyAdminPassword', () => {
  it('accepts the configured password', () => {
    expect(verifyAdminPassword('correct-horse')).toBe(true);
  });

  it.each([
    ['a wrong password of equal length', 'correct-horsE'],
    ['a prefix of the password', 'correct'],
    ['a superstring of the password', 'correct-horse-battery'],
    ['an empty password', ''],
  ])('rejects %s', (_label, candidate) => {
    expect(verifyAdminPassword(candidate)).toBe(false);
  });

  it('throws when ADMIN_PASSWORD is not configured', () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    expect(() => verifyAdminPassword('anything')).toThrow(/ADMIN_PASSWORD/);
  });
});

describe('verifyAdminAccess', () => {
  it('authorizes a valid session cookie as a human', () => {
    const result = verifyAdminAccess(req({ cookies: { admin_token: generateAdminToken() } }));
    expect(result).toEqual({ authorized: true, isBot: false, botClient: null });
  });

  it('refuses the forged cookie that previously granted full access', () => {
    const forged = Buffer.from('admin:').toString('base64');
    expect(verifyAdminAccess(req({ cookies: { admin_token: forged } })).authorized).toBe(false);
  });

  it('authorizes a valid bot key on GET and marks it as a bot', () => {
    vi.stubEnv('ADMIN_READONLY_API_KEY', 'bot-key-123');
    const result = verifyAdminAccess(
      req({
        headers: { authorization: 'Bearer bot-key-123', 'x-bot-client': 'metrics/1.0' },
      }),
    );
    expect(result).toEqual({ authorized: true, isBot: true, botClient: 'metrics/1.0' });
  });

  it('refuses a bot key on a mutating method but still reports it as a bot', () => {
    vi.stubEnv('ADMIN_READONLY_API_KEY', 'bot-key-123');
    const result = verifyAdminAccess(
      req({ method: 'POST', headers: { authorization: 'Bearer bot-key-123' } }),
    );
    expect(result.authorized).toBe(false);
    expect(result.isBot).toBe(true);
  });

  it('refuses an unauthenticated request', () => {
    expect(verifyAdminAccess(req())).toEqual({
      authorized: false,
      isBot: false,
      botClient: null,
    });
  });
});
