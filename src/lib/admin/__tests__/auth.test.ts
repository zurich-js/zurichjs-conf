import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest } from 'next';
import {
  ADMIN_SESSION_TTL_SECONDS,
  generateAdminToken,
  verifyAdminAccess,
  verifyAdminPassword,
  verifyAdminToken,
} from '../auth';

describe('admin authentication', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_PASSWORD', 'test-admin-password');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-session-signing-secret');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('round-trips a signed session token without Math.random', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    const first = generateAdminToken();
    const second = generateAdminToken();

    expect(first).not.toBe(second);
    expect(first.split('.')).toHaveLength(3);
    expect(verifyAdminToken(first)).toBe(true);
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it('rejects forged legacy and tampered tokens', () => {
    const token = generateAdminToken();
    const [version, payload, signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({
        sub: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        nonce: 'attacker-controlled-nonce',
      })
    ).toString('base64url');

    expect(verifyAdminToken(Buffer.from('admin:anything').toString('base64'))).toBe(false);
    expect(verifyAdminToken(`${version}.${forgedPayload}.${signature}`)).toBe(false);
    expect(verifyAdminToken(`${version}.${payload}.${signature.slice(1)}`)).toBe(false);
  });

  it('rejects expired sessions', () => {
    const token = generateAdminToken();
    vi.advanceTimersByTime(ADMIN_SESSION_TTL_SECONDS * 1000 + 1);

    expect(verifyAdminToken(token)).toBe(false);
  });

  it('invalidates sessions when the signing secret rotates', () => {
    const token = generateAdminToken();
    vi.stubEnv('ADMIN_SESSION_SECRET', 'rotated-session-signing-secret');

    expect(verifyAdminToken(token)).toBe(false);
  });

  it('falls back to the admin password when no dedicated secret is set', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', '');
    const token = generateAdminToken();

    expect(verifyAdminToken(token)).toBe(true);
  });

  it('rejects malformed input and a missing signing secret without throwing', () => {
    for (const token of [undefined, '', 'v1', 'v1.a.b', 'v1.a.b.c', 'v2.a.b']) {
      expect(() => verifyAdminToken(token)).not.toThrow();
      expect(verifyAdminToken(token)).toBe(false);
    }

    vi.stubEnv('ADMIN_SESSION_SECRET', '');
    vi.stubEnv('ADMIN_PASSWORD', '');
    expect(() => verifyAdminToken('v1.a.b')).not.toThrow();
    expect(verifyAdminToken('v1.a.b')).toBe(false);
    expect(() => generateAdminToken()).toThrow(/ADMIN_SESSION_SECRET or ADMIN_PASSWORD/);
  });

  it('verifies the configured password', () => {
    expect(verifyAdminPassword('test-admin-password')).toBe(true);
    expect(verifyAdminPassword('wrong-password')).toBe(false);
  });

  it('authorizes the read-only bot key for GET requests only', () => {
    vi.stubEnv('ADMIN_READONLY_API_KEY', 'test-read-only-key');
    const request = (method: string) =>
      ({
        method,
        url: '/api/admin/sponsorships',
        cookies: {},
        headers: {
          authorization: 'Bearer test-read-only-key',
          'x-bot-client': 'auth-regression-test',
        },
      }) as unknown as NextApiRequest;

    expect(verifyAdminAccess(request('GET'))).toEqual({
      authorized: true,
      isBot: true,
      botClient: 'auth-regression-test',
    });
    expect(verifyAdminAccess(request('PUT'))).toEqual({
      authorized: false,
      isBot: true,
      botClient: 'auth-regression-test',
    });
  });
});
