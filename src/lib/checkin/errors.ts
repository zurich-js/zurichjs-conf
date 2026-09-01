/**
 * Door check-in error types.
 *
 * One class per failure family so PostHog error tracking titles the issue by
 * what broke ("DoorRpcError: door_resolve failed") instead of the driver's
 * exception class, and groups all occurrences of a function's failure together
 * via the fingerprint even when the underlying Postgres message varies.
 */

import { AppError, type AppErrorOptions } from '@/lib/errors';

/** A door_* Postgres function call failed or returned an impossible payload. */
export class DoorRpcError extends AppError {
  constructor(fn: string, detail: string, options: AppErrorOptions = {}) {
    super(`${fn} failed: ${detail}`, {
      type: 'system',
      severity: 'high',
      fingerprint: `door-rpc:${fn}`,
      ...options,
      context: { fn, ...options.context },
    });
  }
}
