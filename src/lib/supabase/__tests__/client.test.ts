import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ id: Symbol('supabase-client') })),
  createSSRBrowserClient: vi.fn(() => ({ id: Symbol('browser-client') })),
  env: {
    supabase: { url: 'https://project.supabase.co', secretKey: 'service-role-key' },
  },
  clientEnv: {
    supabase: { url: 'https://project.supabase.co', publishableKey: 'publishable-key' },
  },
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@supabase/ssr', () => ({ createBrowserClient: mocks.createSSRBrowserClient }));
vi.mock('@/config/env', () => ({ env: mocks.env, clientEnv: mocks.clientEnv }));

describe('createServiceRoleClient', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createClient.mockClear();
  });

  it('builds the client once and shares it across calls', async () => {
    const { createServiceRoleClient } = await import('../client');

    const first = createServiceRoleClient();
    const second = createServiceRoleClient();
    const third = createServiceRoleClient();

    // A client per call gave every request its own fetch stack, so nothing
    // reused the connection to Supabase.
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('shares the instance with callers that refine the schema type', async () => {
    const { createServiceRoleClient } = await import('../client');

    expect(createServiceRoleClient()).toBe(createServiceRoleClient<never>());
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
  });

  it('does not persist or refresh a session', async () => {
    const { createServiceRoleClient } = await import('../client');

    createServiceRoleClient();

    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  });

  it('throws instead of caching a client built from missing config', async () => {
    mocks.env.supabase.secretKey = '';
    const { createServiceRoleClient } = await import('../client');

    expect(() => createServiceRoleClient()).toThrow('SUPABASE_SECRET_KEY is missing');
    expect(mocks.createClient).not.toHaveBeenCalled();

    mocks.env.supabase.secretKey = 'service-role-key';
  });
});
