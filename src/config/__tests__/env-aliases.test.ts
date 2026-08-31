/**
 * The Supabase/Vercel integration writes Supabase's OLDER variable names.
 *
 * With branching, every preview deployment needs the credentials of its own
 * branch database, which only exist once that branch does — a new one per pull
 * request, each with different keys. Nobody maintains that by hand; the
 * integration syncs it. But it writes NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY, and this app asks for the newer names. Without the
 * fallbacks the sync sets variables nothing reads and every preview deployment
 * fails its env check at build time.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_BASE_URL = 'https://zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_URL;
  delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  delete process.env.NEXT_PUBLIC_VERCEL_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('base url on a preview deployment', () => {
  it('does not require NEXT_PUBLIC_BASE_URL on a Vercel preview', async () => {
    // This module throws at import time on a missing required variable, so
    // without the fallback a preview build fails before rendering anything —
    // for a variable whose value would have been wrong on a preview anyway.
    delete process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'k';
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'zurichjs-conf-abc123.vercel.app';

    const { clientEnv } = await import('../env');
    expect(clientEnv.baseUrl).toBe('https://zurichjs-conf-abc123.vercel.app');
  });

  it('still requires it everywhere else', async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'k';

    await expect(import('../env')).rejects.toThrow(/NEXT_PUBLIC_BASE_URL/);
  });

  it('prefers the preview url over an inherited production one', async () => {
    // NEXT_PUBLIC_BASE_URL is normally set for every environment, so on a preview
    // it names production. The preview url has to win.
    process.env.NEXT_PUBLIC_BASE_URL = 'https://zurichjs.com';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'k';
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'zurichjs-conf-abc123.vercel.app';

    const { clientEnv } = await import('../env');
    expect(clientEnv.baseUrl).toBe('https://zurichjs-conf-abc123.vercel.app');
  });
});

describe('Supabase key aliases', () => {
  it('accepts the name the Vercel integration writes', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synced-by-integration';

    const { clientEnv } = await import('../env');
    expect(clientEnv.supabase.publishableKey).toBe('synced-by-integration');
  });

  it('prefers the explicit name when both are present', async () => {
    // Production sets the real name; a stale synced value must not win.
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'explicit';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synced';

    const { clientEnv } = await import('../env');
    expect(clientEnv.supabase.publishableKey).toBe('explicit');
  });

  it('still fails loudly when neither is set', async () => {
    // The fallback must not turn a missing key into a silent undefined.
    await expect(import('../env')).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});
