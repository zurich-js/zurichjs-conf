/**
 * CFP Supabase Client
 * Dedicated service role client for CFP table operations
 *
 * Note: CFP tables are not included in the auto-generated database types.
 * This client is untyped but centralized here for consistency.
 * TODO: Regenerate Supabase types to include CFP tables and add proper typing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cfpClientInstance: SupabaseClient<any> | null = null;

/**
 * Create a Supabase client for CFP operations
 * Uses service role to bypass RLS (server-side only)
 *
 * Note: Returns untyped client since CFP tables aren't in generated types.
 * Use type assertions when accessing data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCfpServiceClient(): SupabaseClient<any> {
  if (cfpClientInstance) {
    return cfpClientInstance;
  }

  if (!env.supabase.url) {
    throw new Error('[CFP Supabase] SUPABASE_URL is missing');
  }

  if (!env.supabase.serviceRoleKey) {
    throw new Error('[CFP Supabase] SUPABASE_SERVICE_ROLE_KEY is missing');
  }

  cfpClientInstance = createClient(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return cfpClientInstance;
}

/**
 * Standardized error result type for CFP operations
 */
export interface CfpResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Standardized success result type
 */
export interface CfpSuccessResult {
  success: boolean;
  error: string | null;
}

/**
 * Helper to create error result
 */
export function cfpError<T>(message: string): CfpResult<T> {
  return { data: null, error: message };
}

/**
 * Helper to create success result with data
 */
export function cfpSuccess<T>(data: T): CfpResult<T> {
  return { data, error: null };
}

/**
 * Helper to handle Supabase errors consistently
 */
export function handleSupabaseError(
  error: { message: string } | null,
  fallbackMessage: string
): string {
  if (error?.message) {
    console.error(`[CFP] ${fallbackMessage}:`, error.message);
    return error.message;
  }
  return fallbackMessage;
}
