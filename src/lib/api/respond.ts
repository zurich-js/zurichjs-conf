/**
 * Server-side error responses with a traceability spine.
 *
 * Every error response carries `{ error, code, requestId }`:
 * - `error` — a safe, actionable message (`clientMessageFor`); raw
 *   Stripe/Postgres text never reaches the browser on 5xx,
 * - `code` — a member of `ErrorCodes`, searchable verbatim in PostHog and
 *   Sentry (`error_code` tag) and documented in docs/INCIDENT_RESPONSE.md,
 * - `requestId` — also set as the `x-request-id` response header, stamped on
 *   every log line and both trackers, so a user's screenshot pins the exact
 *   trace.
 *
 * Prefer `withApiHandler` (./handler.ts) for new/migrated routes; these
 * helpers are the one-line escape hatch for hand-rolled ones:
 *
 *   const requestId = getRequestId(req, res)
 *   ...
 *   catch (err) {
 *     return respondError(res, err, { requestId, log })
 *   }
 *
 * Server-only — do not export from the `@/lib/api` barrel (client bundle).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'

import {
  AppError,
  ErrorCodes,
  HttpError,
  clientMessageFor,
  isErrorCode,
  type ErrorCode,
} from '@/lib/errors'
import type { ScopedLogger } from '@/lib/logger'

export interface ApiErrorBody {
  error: string
  code: ErrorCode
  requestId: string
  issues?: unknown
}

/**
 * Resolve (or mint) the correlation id for this request and stamp it on the
 * response header and the Sentry scope. Idempotent per response.
 */
export function getRequestId(req: NextApiRequest, res: NextApiResponse): string {
  const existing = res.getHeader('x-request-id')
  if (typeof existing === 'string' && existing) return existing

  const inbound = req.headers['x-request-id'] ?? req.headers['x-vercel-id']
  const requestId =
    typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 128
      ? inbound
      : crypto.randomUUID()

  res.setHeader('x-request-id', requestId)
  // Tag the current Sentry scope so unhandled throws from this request carry
  // the same id the user can read off the response.
  Sentry.getIsolationScope().setTag('request_id', requestId)
  return requestId
}

interface ResolvedErrorResponse {
  status: number
  body: ApiErrorBody
  /** Severity of the log line this response deserves. */
  logLevel: 'warn' | 'error'
}

function statusForAppError(error: AppError): number {
  switch (error.code) {
    case ErrorCodes.AUTH_REQUIRED:
      return 401
    case ErrorCodes.AUTH_FORBIDDEN:
    case ErrorCodes.CFP_CLOSED:
      return 403
    case ErrorCodes.NOT_FOUND:
      return 404
    case ErrorCodes.METHOD_NOT_ALLOWED:
      return 405
    case ErrorCodes.RATE_LIMITED:
      return 429
    case ErrorCodes.VALIDATION_FAILED:
      return 400
    default:
      break
  }
  switch (error.type) {
    case 'validation':
      return 400
    case 'auth':
      return 401
    default:
      return 500
  }
}

/**
 * Map a thrown error to `{ status, body }` without ever leaking an internal
 * message: 4xx `HttpError`s show their own message (written for users at the
 * throw site); everything else shows the registry message for its code.
 */
export function resolveErrorResponse(error: unknown, requestId: string): ResolvedErrorResponse {
  if (error instanceof HttpError) {
    const code = isErrorCode(error.code)
      ? error.code
      : error.status < 500
        ? ErrorCodes.VALIDATION_FAILED
        : ErrorCodes.INTERNAL
    return {
      status: error.status,
      body: {
        error: error.status < 500 ? error.message : clientMessageFor(code),
        code,
        requestId,
      },
      logLevel: error.status < 500 ? 'warn' : 'error',
    }
  }

  if (error instanceof AppError) {
    const status = statusForAppError(error)
    const code = isErrorCode(error.code) ? error.code : ErrorCodes.INTERNAL
    return {
      status,
      body: { error: clientMessageFor(code), code, requestId },
      logLevel: status < 500 ? 'warn' : 'error',
    }
  }

  return {
    status: 500,
    body: { error: clientMessageFor(ErrorCodes.INTERNAL), code: ErrorCodes.INTERNAL, requestId },
    logLevel: 'error',
  }
}

export function respondError(
  res: NextApiResponse,
  error: unknown,
  options: { requestId: string; log?: ScopedLogger; message?: string }
): void {
  const { requestId, log, message } = options
  const resolved = resolveErrorResponse(error, requestId)

  if (log) {
    // Log ONCE, here — lib code that threw a tagged AppError should not also
    // have logged (see src/lib/logger/CLAUDE.md).
    if (resolved.logLevel === 'error') {
      log.error(message ?? 'Request failed', error, { requestId, status: resolved.status })
    } else {
      log.warn(message ?? `Request rejected (${resolved.status})`, {
        requestId,
        status: resolved.status,
        code: resolved.body.code,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (!res.headersSent) {
    res.status(resolved.status).json(resolved.body)
  }
}
