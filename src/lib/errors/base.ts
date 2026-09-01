/**
 * Application error base class.
 *
 * WHY THIS EXISTS
 * PostHog Error Tracking titles an issue with the error's `name` and groups
 * issues by type + stack. A domain failure rethrown as `new Error(pgError.message)`
 * shows up as "Error" (or worse, the raw driver `TypeError`), and every distinct
 * Postgres message becomes its own group. Subclassing `AppError` gives every
 * rethrown failure:
 *
 * - a clean, stable title (the subclass name, e.g. `DoorRpcError`),
 * - the original failure preserved on `cause` (serialized by the logger and
 *   sent to PostHog as the exception chain),
 * - structured tags (`code`, `type`, `severity`, `context`) that the logger
 *   forwards without the call site repeating them,
 * - a fingerprint that groups one logical issue into one tracked issue. When
 *   not given explicitly it defaults to `ClassName/CODE`, so grouping works
 *   without opt-in; pass one only when that default would still split or
 *   merge issues wrongly.
 *
 * USAGE
 *   export class DoorRpcError extends AppError {}
 *
 *   throw new DoorRpcError(`door_resolve failed: ${error.message}`, {
 *     cause: error,
 *     code: error.code,
 *     type: 'system',
 *     context: { fn: 'door_resolve' },
 *   });
 *
 * `log.error(msg, err)` then needs no extra tagging — the logger reads the
 * metadata straight off the error.
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorType = 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'

export interface AppErrorOptions {
  /** The original failure. Preserved and reported as the exception chain. */
  cause?: unknown
  /** Machine-readable code — prefer a member of `ErrorCodes` from `./codes`. */
  code?: string
  type?: ErrorType
  severity?: ErrorSeverity
  /** Structured metadata forwarded to PostHog/Sentry (ids, function names — no PII). */
  context?: Record<string, unknown>
  /**
   * Force error-tracking grouping (PostHog `$exception_fingerprint`, Sentry
   * `fingerprint`). Defaults to `ClassName/CODE` when omitted.
   */
  fingerprint?: string
}

export class AppError extends Error {
  readonly code?: string
  readonly type?: ErrorType
  readonly severity?: ErrorSeverity
  readonly context?: Record<string, unknown>
  readonly fingerprint: string

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined)
    // The subclass name is the PostHog issue title — `class DoorRpcError extends
    // AppError {}` needs no constructor of its own to be titled correctly.
    this.name = new.target.name
    this.code = options.code
    this.type = options.type
    this.severity = options.severity
    this.context = options.context
    this.fingerprint = options.fingerprint ?? `${new.target.name}/${options.code ?? 'GENERIC'}`
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
