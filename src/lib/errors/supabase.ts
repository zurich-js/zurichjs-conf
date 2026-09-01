/**
 * Supabase error boundary.
 *
 * Supabase never throws — it returns `{ data, error }` where `error` is a
 * plain PostgrestError object. Destructuring only `data` silently swallows
 * failures (the audit found 81 such sites, including revenue totals rendering
 * wrong numbers as if correct). This helper makes checking one line:
 *
 *   const { data, error } = await supabase.from('tickets').select('id')
 *   throwIfDbError(error, 'Failed to load tickets', { context: { sessionId } })
 *   // data is safe to use past this line
 *
 * The thrown `DatabaseError` carries the Postgres diagnostics (`code`,
 * `details`, `hint`) on its cause chain, so the log explains *which* table or
 * permission failed, not just that something did.
 */

import { ErrorCodes, type ErrorCode } from './codes'
import { DatabaseError } from './domain'

/** Structural match for PostgrestError / StorageError without importing supabase-js. */
export interface DbErrorLike {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

export function throwIfDbError(
  error: DbErrorLike | null | undefined,
  message: string,
  options: { code?: ErrorCode; context?: Record<string, unknown> } = {}
): asserts error is null | undefined {
  if (!error) return
  throw new DatabaseError(message, {
    cause: error,
    code: options.code ?? ErrorCodes.DB_QUERY_FAILED,
    context: options.context,
  })
}
