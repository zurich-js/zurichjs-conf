import { describe, it, expect, afterEach, vi } from 'vitest';
import { isClockPreviewAllowed, parsePreviewInstant, resolvePreviewInstant } from '../preview-clock';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parsePreviewInstant', () => {
  it('accepts ISO instants, including the first value of a repeated query param', () => {
    expect(parsePreviewInstant('2026-09-11T07:30:00Z')?.toISOString()).toBe('2026-09-11T07:30:00.000Z');
    expect(parsePreviewInstant(['2026-09-11T07:30:00Z', 'ignored'])?.toISOString()).toBe('2026-09-11T07:30:00.000Z');
  });

  it('rejects garbage, blanks and implausible years', () => {
    expect(parsePreviewInstant('yesterday')).toBeNull();
    expect(parsePreviewInstant('')).toBeNull();
    expect(parsePreviewInstant(undefined)).toBeNull();
    expect(parsePreviewInstant('1999-01-01T00:00:00Z')).toBeNull();
    expect(parsePreviewInstant('2500-01-01T00:00:00Z')).toBeNull();
  });
});

describe('isClockPreviewAllowed / resolvePreviewInstant', () => {
  it('is allowed locally and on preview deployments', () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
    expect(isClockPreviewAllowed()).toBe(true);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(resolvePreviewInstant('2026-09-11T07:30:00Z')).not.toBeNull();
  });

  it('is ignored on production, whichever spelling of the env var is present', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isClockPreviewAllowed()).toBe(false);
    expect(resolvePreviewInstant('2026-09-11T07:30:00Z')).toBeNull();
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    expect(isClockPreviewAllowed()).toBe(false);
  });
});
