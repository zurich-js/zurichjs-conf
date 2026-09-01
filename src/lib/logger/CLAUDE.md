# Logger — `src/lib/logger/`

Structured logger. Replaces all `console.log` calls. Errors are forwarded to
PostHog automatically.

## Use it

```typescript
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Submissions API');

log.info('Submission created', { submissionId, speakerId });
log.warn('Rate limit approaching', { ip, remaining });
log.error('Failed to create submission', err, { speakerId });
log.debug('Cache miss', { key });
```

## `logger.scope('Name')`

Always create a scoped logger at file top. The scope is included in the structured
output and helps filter logs in PostHog. Match the naming used elsewhere:

- API routes: `logger.scope('<Domain> API')` — e.g. `'CFP Submissions API'`.
- Lib modules: `logger.scope('<Domain> <Thing>')` — e.g. `'Stripe Webhook'`.
- Components: rarely log; if needed, `logger.scope('<Component>')`.

## Levels

| Level | When |
|---|---|
| `debug` | Verbose dev info. Stripped in production. |
| `info` | Notable success path events (submission created, payment fulfilled). |
| `warn` | Recoverable issues (rate-limit hit, retry needed, fallback used). |
| `error` | Unrecoverable failures, exceptions caught in handlers. |

## Error signature

```typescript
log.error(message: string, error: unknown, context?: Record<string, unknown>);
```

- `message` — human-readable summary.
- `error` — the caught error (any type). Serialized to `name`, `message`, `stack`.
- `context` — structured metadata (`userId`, `submissionId`, `orderId`). Forwarded
  to PostHog.

## PostHog forwarding

All `log.error()` calls capture a real `$exception` (via the SDKs' native
`captureException`) so they appear in PostHog Error Tracking with proper
grouping, plus the legacy `error_occurred` custom event for existing insights.
Severity and error type are auto-inferred. Don't also call
`analytics.capture('error')` — it's a duplicate.

For clean issue titles, throw a named subclass of `AppError` (`@/lib/errors`)
instead of rethrowing `new Error(message)`:

```typescript
throw new DoorRpcError('door_resolve', pgError.message, {
  cause: pgError,          // preserved + serialized as the exception chain
  code: pgError.code,
  context: { scannedId },  // forwarded to PostHog automatically
});
```

The logger reads `type`, `severity`, `code`, `context`, and `fingerprint`
straight off an `AppError` — no need to repeat them at the `log.error` call
site. `fingerprint` (also accepted in `log.error` context) maps to
`$exception_fingerprint` and forces error-tracking grouping when one logical
issue would otherwise split into many.

Log each failure ONCE, where it's caught. A lib function that throws a tagged
`AppError` should not also `log.error` — the API route catching it does that,
otherwise the same failure shows up twice under two titles.

## Don'ts

- Don't use `console.log` / `console.error` anywhere outside this file.
- Don't include PII in `context` beyond email when needed.
- Don't log full request bodies — log the IDs and relevant fields only.
- Don't log secrets, tokens, or signed URLs.
