/**
 * Error toolkit barrel.
 *
 * - `base.ts` — `AppError` (grouped titles + auto-fingerprint) and the
 *   `ErrorType`/`ErrorSeverity` unions. Read its header before adding classes.
 * - `codes.ts` — the machine-readable `ErrorCodes` registry + safe client
 *   messages. Every API error response and tracked event carries one.
 * - `domain.ts` — subclasses presetting type/severity (DatabaseError,
 *   PaymentError, FulfillmentError, HttpError, …).
 * - `supabase.ts` — `throwIfDbError` one-liner for `{ data, error }` results.
 */

export {
  AppError,
  isAppError,
  type AppErrorOptions,
  type ErrorSeverity,
  type ErrorType,
} from './base'
export { ErrorCodes, clientMessageFor, isErrorCode, type ErrorCode } from './codes'
export {
  AuthError,
  ConfigError,
  DatabaseError,
  EmailDeliveryError,
  ExternalServiceError,
  FulfillmentError,
  HttpError,
  PaymentError,
} from './domain'
export { throwIfDbError, type DbErrorLike } from './supabase'
