/**
 * Standard API route wrapper.
 *
 * Gives every route, in ~5 lines, what the audit found missing across 211
 * hand-rolled handlers: a request id on every response and log line, method
 * checking with `Allow`, Zod validation with the documented `issues` shape,
 * and a catch-all that maps thrown `AppError`/`HttpError`s to safe
 * `{ error, code, requestId }` bodies (never raw internals) while logging
 * once to console + PostHog + Sentry.
 *
 *   const log = logger.scope('Refund Ticket API')
 *
 *   export default withApiHandler(
 *     { scope: 'Refund Ticket API', methods: ['POST'], bodySchema },
 *     async (req, res, ctx) => {
 *       const { authorized } = verifyAdminAccess(req)
 *       if (!authorized) throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED })
 *       ...
 *       res.status(200).json({ success: true })
 *     }
 *   )
 *
 * Handlers throw instead of hand-rolling error responses:
 * - `throw new HttpError(404, 'Ticket not found', { code: ErrorCodes.NOT_FOUND })`
 *   → that status, that message (4xx messages are user-facing by contract),
 * - `throw new FulfillmentError(...)` (or any AppError) → status from its
 *   code/type, safe registry message,
 * - anything else → 500 INTERNAL, message never leaked.
 *
 * Server-only — do not export from the `@/lib/api` barrel (client bundle).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import type { ZodType } from 'zod'

import { HttpError, ErrorCodes } from '@/lib/errors'
import { logger, type ScopedLogger } from '@/lib/logger'
import { getRequestId, respondError } from './respond'

export interface ApiHandlerContext<TBody = unknown, TQuery = unknown> {
  /** Correlation id — already set as the `x-request-id` response header. */
  requestId: string
  /** Scoped logger with `requestId` baked into every line. */
  log: ScopedLogger
  /** Parsed request body (when `bodySchema` given; `undefined` otherwise). */
  body: TBody
  /** Parsed query (when `querySchema` given; `undefined` otherwise). */
  query: TQuery
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface WithApiHandlerOptions<TBody, TQuery> {
  /** Logger scope, e.g. 'Refund Ticket API'. Match existing naming. */
  scope: string
  methods: readonly Method[]
  bodySchema?: ZodType<TBody>
  querySchema?: ZodType<TQuery>
}

export function withApiHandler<TBody = unknown, TQuery = unknown>(
  options: WithApiHandlerOptions<TBody, TQuery>,
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    ctx: ApiHandlerContext<TBody, TQuery>
  ) => Promise<void> | void
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return async function wrappedHandler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    const requestId = getRequestId(req, res)
    const log = logger.scope(options.scope, { requestId })

    try {
      if (!req.method || !options.methods.includes(req.method as Method)) {
        res.setHeader('Allow', options.methods.join(', '))
        throw new HttpError(405, 'This HTTP method is not supported here.', {
          code: ErrorCodes.METHOD_NOT_ALLOWED,
          context: { method: req.method },
        })
      }

      let body: TBody = undefined as TBody
      if (options.bodySchema) {
        const result = options.bodySchema.safeParse(req.body)
        if (!result.success) {
          log.warn('Validation failed', { requestId, issues: result.error.issues })
          res.status(400).json({
            error: 'Validation failed',
            code: ErrorCodes.VALIDATION_FAILED,
            issues: result.error.issues,
            requestId,
          })
          return
        }
        body = result.data
      }

      let query: TQuery = undefined as TQuery
      if (options.querySchema) {
        const result = options.querySchema.safeParse(req.query)
        if (!result.success) {
          log.warn('Query validation failed', { requestId, issues: result.error.issues })
          res.status(400).json({
            error: 'Validation failed',
            code: ErrorCodes.VALIDATION_FAILED,
            issues: result.error.issues,
            requestId,
          })
          return
        }
        query = result.data
      }

      await handler(req, res, { requestId, log, body, query })
    } catch (error) {
      respondError(res, error, { requestId, log })
    }
  }
}
