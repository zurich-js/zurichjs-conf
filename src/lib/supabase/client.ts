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
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';
import { env, clientEnv } from '@/config/env';

/**
 * Browser client instance for client-side operations
 * This client respects RLS policies
 */
let browserClientInstance: ReturnType<typeof createSSRBrowserClient<Database>> | null = null;

/**
 * Service role client, memoized for the lifetime of the process.
 *
 * Building a fresh client per call meant every server request created its own
 * fetch stack, so nothing reused the connection to Supabase — a request making
 * several lookups paid a new TLS handshake for each one. The client carries no
 * per-request state (no session persistence, no token refresh), so a single
 * instance per process is safe to share.
 */
let serviceRoleClientInstance: unknown = null;

/**
 * Create a Supabase client with service role privileges
 * This bypasses RLS policies and should only be used on the server
 *
 * The schema type defaults to the generated `Database`. A module whose
 * Postgres functions are not generated yet may pass a hand-written extension
 * of it (e.g. `DoorDatabase` in `@/lib/checkin/door-database`) so its rpc
 * calls stay fully typed without casts.
 */
export function createServiceRoleClient<Schema extends Database = Database>() {
  if (serviceRoleClientInstance === null) {
    if (!env.supabase.url) {
      throw new Error('[Supabase] ❌ SUPABASE_URL is missing');
    }

    if (!env.supabase.secretKey) {
      throw new Error('[Supabase] ❌ SUPABASE_SECRET_KEY is missing');
    }

    serviceRoleClientInstance = createClient<Database>(
      env.supabase.url,
      env.supabase.secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  // `Schema` only refines the compile-time shape of the same runtime client,
  // so every caller shares the one instance regardless of the type it asks for.
  return serviceRoleClientInstance as ReturnType<typeof createClient<Schema>>;
}

/**
 * Get or create browser-compatible Supabase client
 * Uses @supabase/ssr to properly sync session to cookies for API route auth
 * This client respects RLS policies and can be used in browser/client-side code
 */
export function createBrowserClient() {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  if (!clientEnv.supabase.url) {
    throw new Error('[Supabase] ❌ SUPABASE_URL is missing');
  }

  if (!clientEnv.supabase.publishableKey) {
    throw new Error('[Supabase] ❌ SUPABASE_PUBLISHABLE_KEY is missing');
  }

  // Use @supabase/ssr's createBrowserClient for proper cookie synchronization
  // This ensures session is available to API routes via cookies
  browserClientInstance = createSSRBrowserClient<Database>(
    clientEnv.supabase.url,
    clientEnv.supabase.publishableKey
  );

  return browserClientInstance;
}

/**
 * Export singleton browser client instance for convenience
 * This is the default client for client-side operations
 */
export const supabase = createBrowserClient();
