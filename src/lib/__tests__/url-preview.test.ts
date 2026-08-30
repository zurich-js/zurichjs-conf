/**
 * Tests for the Vercel preview branch of getBaseUrl.
 *
 * This value builds the door staff magic-link redirect and the QR payload
 * printed on badges. If a preview deployment reports the production domain, a
 * volunteer rehearsing on a preview is sent to the production app and signs in
 * against the production database — checking real attendees in by accident.
 * That is the failure these cover.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_BASE_URL = 'https://zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-key';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_URL;
  delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  delete process.env.NEXT_PUBLIC_VERCEL_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

async function getBaseUrl() {
  return (await import('../url')).getBaseUrl;
}

describe('getBaseUrl on Vercel', () => {
  it('reports the preview deployment, not the production domain', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'zurichjs-conf-abc123.vercel.app';

    expect((await getBaseUrl())()).toBe('https://zurichjs-conf-abc123.vercel.app');
  });

  it('leaves production alone', async () => {
    // The whole point of the guard: only `preview` diverts.
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_URL = 'zurichjs-conf-xyz.vercel.app';

    expect((await getBaseUrl())()).toBe('https://zurichjs.com');
  });

  it('leaves a non-Vercel environment alone', async () => {
    expect((await getBaseUrl())()).toBe('https://zurichjs.com');
  });

  it('reads the NEXT_PUBLIC_ twins, which are the only ones in the browser bundle', async () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    process.env.NEXT_PUBLIC_VERCEL_URL = 'zurichjs-conf-def456.vercel.app';

    expect((await getBaseUrl())()).toBe('https://zurichjs-conf-def456.vercel.app');
  });

  it('adds the scheme, since VERCEL_URL is a bare host', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'example.vercel.app';

    expect((await getBaseUrl())()).toMatch(/^https:\/\//);
  });

  it('falls back rather than returning a schemeless URL when the host is missing', async () => {
    // A preview with no VERCEL_URL should not produce "https://undefined".
    process.env.VERCEL_ENV = 'preview';

    expect((await getBaseUrl())()).toBe('https://zurichjs.com');
  });
});
