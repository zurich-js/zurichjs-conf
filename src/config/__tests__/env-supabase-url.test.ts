/**
 * The Supabase URL carries the publishable key on the client and the
 * service-role key on the server. A plain-http value would send both in
 * cleartext, so the env check rejects it — except for the local Supabase
 * stack, which only ever speaks http on 127.0.0.1.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_BASE_URL = 'https://zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('NEXT_PUBLIC_SUPABASE_URL scheme', () => {
  it('accepts a hosted https project', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    const { clientEnv } = await import('../env');
    expect(clientEnv.supabase.url).toBe('https://project.supabase.co');
  });

  it('accepts the local Supabase stack over http', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    const { clientEnv } = await import('../env');
    expect(clientEnv.supabase.url).toBe('http://127.0.0.1:54321');
  });

  it('rejects a remote http URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://project.supabase.co';
    await expect(import('../env')).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL must use https/);
  });

  it('rejects a value that is not a URL at all', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'project.supabase.co';
    await expect(import('../env')).rejects.toThrow(/must be a valid URL/);
  });
});
