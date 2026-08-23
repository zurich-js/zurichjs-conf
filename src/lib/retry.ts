/**
 * Server-side retry helpers for transient failures.
 *
 * Use these instead of writing ad-hoc retry loops so behavior (backoff, jitter,
 * Retry-After handling, logging) stays consistent across the codebase.
 *
 * For client-side data fetching, prefer TanStack Query's built-in `retry`
 * option — these helpers are for Node/serverless code.
 */

import { logger } from '@/lib/logger'

const log = logger.scope('Retry')

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
      const isLast = attempt === attempts
      if (isLast || !shouldRetry(error, attempt)) {
        throw error
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
  throw lastError
}

/** Abort errors from AbortSignal — never retry these. */
export function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  // DOMException with name 'AbortError', or Node's AbortError
  return error.name === 'AbortError'
}

/** Network-level fetch failure (DNS, TCP reset, TLS, timeout). */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  // Abort errors are intentional cancellations, not transient failures.
  if (isAbortError(error)) return false
  // Node's undici surfaces transient failures as `TypeError: fetch failed`
  // with a `cause` chain. Cover both the message and common cause codes.
  if (error.name === 'TypeError' && error.message === 'fetch failed') return true
  const cause = (error as { cause?: { code?: string } }).cause
  const code = cause?.code
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    code === 'UND_ERR_SOCKET' ||
    code === 'UND_ERR_CONNECT_TIMEOUT'
  )
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
 * Respects AbortSignal: if the signal is aborted, throws immediately without retry.
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

  // Extract signal from init to check abort state before retries
  const signal = init?.signal

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Check if already aborted before attempting
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    }

    try {
      const response = await fetch(input, init)
      if (!retryStatuses.includes(response.status) || attempt === attempts) {
        return response
      }

      // Check abort before waiting to retry
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('Aborted', 'AbortError')
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

      // Never retry abort errors — they are intentional cancellations
      if (isAbortError(error)) {
        throw error
      }

      const isLast = attempt === attempts
      if (isLast || !isNetworkError(error)) {
        throw error
      }

      // Check abort before waiting to retry
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('Aborted', 'AbortError')
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
  throw lastError
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
