/**
 * Supabase Client Setup
 * Creates Supabase clients for both server-side and client-side operations
 *
 * IMPORTANT: Service role client bypasses Row Level Security (RLS) policies
 * Only use service role client for:
 * - Creating tickets after payment verification (webhooks)
 * - Creating workshop registrations after payment verification
 * - Admin operations that require bypassing RLS
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import { env, clientEnv } from '@/config/env';

/**
 * Browser client instance for client-side operations
 * This client respects RLS policies
 */
let browserClientInstance: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Create a Supabase client with service role privileges
 * This bypasses RLS policies and should only be used on the server
 */
export function createServiceRoleClient() {
  console.log('[Supabase] Creating service role client');
  console.log('[Supabase] URL:', env.supabase.url);
  console.log('[Supabase] Service role key:', env.supabase.serviceRoleKey ? '(present)' : '❌ MISSING');

  if (!env.supabase.url) {
    throw new Error('[Supabase] ❌ SUPABASE_URL is missing');
  }

  if (!env.supabase.serviceRoleKey) {
    throw new Error('[Supabase] ❌ SUPABASE_SERVICE_ROLE_KEY is missing');
  }

  const client = createClient<Database>(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  console.log('[Supabase] ✅ Service role client created successfully');
  return client;
}

/**
 * Get or create browser-compatible Supabase client
 * This client respects RLS policies and can be used in browser/client-side code
 */
export function createBrowserClient() {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  if (!clientEnv.supabase.url) {
    throw new Error('[Supabase] ❌ SUPABASE_URL is missing');
  }

  if (!clientEnv.supabase.anonKey) {
    throw new Error('[Supabase] ❌ SUPABASE_ANON_KEY is missing');
  }

  browserClientInstance = createClient<Database>(
    clientEnv.supabase.url,
    clientEnv.supabase.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  return browserClientInstance;
}

/**
 * Export singleton browser client instance for convenience
 * This is the default client for client-side operations
 */
export const supabase = createBrowserClient();
