/**
 * Supabase Module Exports
 * Provides both service role client (server-side) and browser client (client-side)
 */

// Service role client for webhook handlers and server-side operations
export { createServiceRoleClient } from './client';

// Browser client for client-side operations
export { createBrowserClient, supabase } from './client';
