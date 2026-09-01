/**
 * Server-side retry helpers for transient failures.
 *
 * Use these instead of writing ad-hoc retry loops so behavior (backoff, jitter,
 * Retry-After handling, logging) stays consistent across the codebase.
 *
 * For client-side data fetching, prefer TanStack Query's built-in `retry`
 * option — these helpers are for Node/serverless code.
 */

import { ErrorCodes, ExternalServiceError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const log = logger.scope('Retry')

/**
 * Exhaustion is a terminal, reportable event — the silent `throw lastError`
 * this replaces never reached error tracking (only per-attempt `warn`s did).
 * The wrapper groups per label (`retry-exhausted:sendDoorEmail`), keeps the
 * final failure on `cause`, and lets the caller's ordinary `log.error` produce
 * a correctly-tagged PostHog/Sentry event with the full chain.
 */
function exhausted(error: unknown, label: string | undefined, attempts: number): ExternalServiceError {
  return new ExternalServiceError(
    `Retries exhausted after ${attempts} attempt(s)${label ? `: ${label}` : ''}`,
    {
      cause: error,
      code: ErrorCodes.RETRY_EXHAUSTED,
      severity: 'high',
      fingerprint: `retry-exhausted:${label ?? 'unlabeled'}`,
      context: { label, attempts },
    }
  )
}

export interface RetryOptions {
  /** Total attempts including the first try. Default: 3. */
  attempts?: number
  /** Initial backoff delay in ms. Default: 300. */
  baseDelayMs?: number
  /** Maximum backoff delay in ms (cap for exponential growth). Default: 5000. */
  maxDelayMs?: number
  /** Decide whether an error should trigger a retry. Default: retry every error. */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** Label used in log lines so failures are traceable. */
  label?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function computeBackoff(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * 2 ** (attempt - 1))
  // Full jitter — avoids thundering-herd retries against shared dependencies.
  return Math.floor(Math.random() * exp)
}

/**
 * Run an async operation with exponential backoff + jitter.
 *
 * @example
 *   await retry(() => doThing(), { attempts: 3, label: 'doThing' })
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    shouldRetry = () => true,
    label,
  } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!shouldRetry(error, attempt)) {
        // Non-transient by the caller's own definition — rethrow untouched so
        // domain `instanceof` checks upstream keep working.
        throw error
      }
      if (attempt === attempts) {
        throw exhausted(error, label, attempts)
      }
      const delay = computeBackoff(attempt, baseDelayMs, maxDelayMs)
      log.warn('Operation failed, retrying', {
        label,
        attempt,
        nextDelayMs: delay,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      await sleep(delay)
    }
  }
  throw exhausted(lastError, label, attempts)
}

/**
 * Network-level fetch failure (DNS, TCP reset, TLS, timeout).
 *
 * Walks the `cause` chain (depth-limited) so a network failure stays
 * recognizable after being wrapped — e.g. the RETRY_EXHAUSTED wrapper thrown
 * by these helpers, or any domain rethrow that preserved `cause`.
 */
export function isNetworkError(error: unknown, depth = 4): boolean {
  if (depth <= 0 || !(error instanceof Error)) return false
  // Node's undici surfaces transient failures as `TypeError: fetch failed`
  // with a `cause` chain. Cover both the message and common cause codes.
  if (error.name === 'TypeError' && error.message === 'fetch failed') return true
  const cause = (error as { cause?: unknown }).cause
  const code = (cause as { code?: string } | undefined)?.code
  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    code === 'UND_ERR_SOCKET' ||
    code === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return true
  }
  return isNetworkError(cause, depth - 1)
}

export interface FetchWithRetryOptions extends RetryOptions {
  /** HTTP statuses treated as retryable. Default: 408, 425, 429, 500, 502, 503, 504. */
  retryStatuses?: number[]
}

const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504]

/**
 * `fetch` with retries for transient network errors and retryable HTTP statuses.
 *
 * Honors the `Retry-After` header on 429/503 responses (seconds or HTTP date).
 * The final response — successful or not — is returned to the caller; callers
 * still decide how to handle non-2xx statuses for their domain.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    attempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    retryStatuses = DEFAULT_RETRY_STATUSES,
    label,
  } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(input, init)
      if (!retryStatuses.includes(response.status) || attempt === attempts) {
        return response
      }
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      const delay = retryAfter ?? computeBackoff(attempt, baseDelayMs, maxDelayMs)
      log.warn('Fetch returned retryable status, retrying', {
        label,
        attempt,
        status: response.status,
        nextDelayMs: delay,
      })
      // Drain body so the socket can be reused.
      await response.arrayBuffer().catch(() => undefined)
      await sleep(delay)
    } catch (error) {
      lastError = error
      if (!isNetworkError(error)) {
        throw error
      }
      if (attempt === attempts) {
        throw exhausted(error, label, attempts)
      }
      const delay = computeBackoff(attempt, baseDelayMs, maxDelayMs)
      log.warn('Fetch threw network error, retrying', {
        label,
        attempt,
        nextDelayMs: delay,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      await sleep(delay)
    }
  }
  throw exhausted(lastError, label, attempts)
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const asInt = Number.parseInt(header, 10)
  if (Number.isFinite(asInt) && asInt >= 0) return asInt * 1000
  const asDate = Date.parse(header)
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - Date.now())
  }
  return null
}
