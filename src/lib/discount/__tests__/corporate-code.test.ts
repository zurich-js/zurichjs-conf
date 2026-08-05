/**
 * Tests for corporate access code signing / verification.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('@/config/env', () => ({
  env: { supabase: { secretKey: 'test-secret-key-for-signing' } },
}));

let signCorporateCode: typeof import('../corporate-code').signCorporateCode;
let verifyCorporateCode: typeof import('../corporate-code').verifyCorporateCode;

beforeAll(async () => {
  const mod = await import('../corporate-code');
  signCorporateCode = mod.signCorporateCode;
  verifyCorporateCode = mod.verifyCorporateCode;
});

describe('corporate access codes', () => {
  it('round-trips a signed code', () => {
    const code = signCorporateCode({ label: 'Acme AG', validDays: 30 });
    const result = verifyCorporateCode(code);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.label).toBe('Acme AG');
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('rejects a tampered payload', () => {
    // Re-signing is impossible without the secret, so editing the label must
    // invalidate the code rather than silently grant access under a new name.
    const code = signCorporateCode({ label: 'Acme AG', validDays: 30 });
    const [, signature] = code.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ label: 'Someone Else', exp: Math.floor(Date.now() / 1000) + 999 })
    ).toString('base64url');

    expect(verifyCorporateCode(`${forgedPayload}.${signature}`)).toEqual({
      valid: false,
      reason: 'bad_signature',
    });
  });

  it('rejects an expired code', () => {
    const code = signCorporateCode({ label: 'Acme AG', validDays: 1 });
    vi.setSystemTime(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

    expect(verifyCorporateCode(code)).toEqual({ valid: false, reason: 'expired' });

    vi.useRealTimers();
  });

  it('rejects malformed input without throwing', () => {
    // A signature of a different length would crash timingSafeEqual if the
    // length guard were removed, so this covers that path too.
    for (const bad of ['', 'nonsense', 'a.b', 'only-one-part', '.', 'a.']) {
      expect(() => verifyCorporateCode(bad)).not.toThrow();
      expect(verifyCorporateCode(bad).valid).toBe(false);
    }
  });

  it('produces a different code per organisation', () => {
    const a = signCorporateCode({ label: 'Acme AG', validDays: 30 });
    const b = signCorporateCode({ label: 'Globex', validDays: 30 });
    expect(a).not.toBe(b);
  });
});
