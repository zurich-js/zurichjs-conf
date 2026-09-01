# API routes — `src/pages/api/`

Next.js Pages Router API handlers. ~210 routes split across speaker (`/api/cfp/*`),
admin (`/api/admin/*`), and public/checkout endpoints.

## Auth — pick the right pattern

Three patterns. Mixing them up causes RLS bypass bugs.

### 1. User session (speakers, attendees, reviewers)

Use for any endpoint a logged-in user calls on their own behalf. Respects RLS.

```typescript
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';

const supabase = createSupabaseApiClient(req, res);
const { data: { session }, error } = await supabase.auth.getSession();
if (error || !session) return res.status(401).json({ error: 'Unauthorized' });
```

### 2. Admin (`/api/admin/*`)

Cookie session (humans) **or** `Authorization: Bearer <ADMIN_READONLY_API_KEY>` (bots, GET only).

```typescript
import { verifyAdminAccess } from '@/lib/admin/auth';

const { authorized, isBot, botClient } = verifyAdminAccess(req);
if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
// If `isBot`, mutations are already blocked by verifyAdminAccess.
```

### 3. Service role (webhooks, system-level)

Bypasses RLS. **Never** use for user-context endpoints — it's a security hole.

```typescript
import { createServiceRoleClient } from '@/lib/supabase/client';
const supabase = createServiceRoleClient();
```

Valid uses: Stripe webhook (`/api/webhooks/stripe.ts`), system jobs, admin-only
operations that explicitly need to ignore RLS.

## Standard handler shape — `withApiHandler`

New and migrated routes use the wrapper from `@/lib/api/handler`. It provides
a `requestId` (response header + error bodies + pre-scoped logger + Sentry
tag), method checking with `Allow`, Zod validation returning the documented
`{ error, code, issues, requestId }` 400, and a catch-all that maps thrown
`AppError`/`HttpError`s to safe `{ error, code, requestId }` bodies — raw
Stripe/Postgres text never reaches the browser on a 5xx.

```typescript
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ErrorCodes, HttpError, throwIfDbError } from '@/lib/errors';

const bodySchema = z.object({
  title: z.string().min(1),
});

export default withApiHandler(
  { scope: 'My Resource API', methods: ['POST'], bodySchema },
  async (req, res, { log, body, requestId }) => {
    // 1. Auth (one of the three patterns above) — unauthorized:
    //    throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });

    // 2. Business logic. Throw instead of hand-rolling error responses:
    //    - 4xx: throw new HttpError(404, 'Not found', { code: ErrorCodes.NOT_FOUND })
    //      (4xx HttpError messages are user-facing and shown verbatim)
    //    - Supabase: const { data, error } = await ...;
    //      throwIfDbError(error, 'Failed to load X', { context: { id } });
    //    - Anything else thrown → 500 with a safe registry message.

    res.status(200).json({ ok: true });
  }
);
```

Hand-rolled routes not yet migrated: at minimum use `getRequestId(req, res)` +
`respondError(res, err, { requestId, log })` from `@/lib/api/respond` in the
catch block. Machine-readable codes live in `src/lib/errors/codes.ts` — add
new ones there, never inline strings. Incident mapping: `docs/INCIDENT_RESPONSE.md`.

## Validation

- Zod schemas in `src/lib/validations/`. Reuse them — don't redefine.
- Always `safeParse`, never `parse` (which throws). Return 400 with `issues` array.

## Logging

- `logger.scope('Route Name')` at file top.
- `log.error(message, err, { ...metadata })` — metadata is forwarded to PostHog.
- Include identifiers (`userId`, `submissionId`, `orderId`) in metadata.

## Stripe webhook (`/api/webhooks/stripe.ts`)

- Disable Next's body parser: `export const config = { api: { bodyParser: false } }`.
- Verify signature with `stripe.webhooks.constructEvent(body, sig, secret)`.
- Handler logic lives in `src/lib/stripe/webhookHandlers.ts` — idempotent by Stripe event id.

## Money & inventory

- Never trust client-supplied prices, totals, or quantities.
- Re-derive prices from `src/config/pricing-stages.ts` + Supabase rows.
- Inventory checks (ticket caps, workshop seats) must be transactional / RLS-enforced.

## Rate limiting

For public endpoints prone to abuse, wrap with `createRateLimiter()` from
`@/lib/rate-limit`. See `src/pages/api/newsletter/subscribe.ts` for a reference.

## CFP closure gate

Any endpoint that creates a new submission must call `isCfpClosed()` from
`@/lib/cfp/closure` and respond `403` with `CFP_CLOSED_ERROR_CODE` when closed.
See `src/pages/api/cfp/submissions/index.ts` line ~48.

## PostHog rewrite

`next.config.ts` rewrites `/ingest/*` to PostHog to bypass ad-blockers. Don't
collide with that path when adding new API routes.

## Tests

- Live in `__tests__/` next to the handler (`src/pages/api/cart/__tests__/abandoned.test.ts`).
- Node environment — mock Supabase/Stripe clients at the boundary.
- See `src/pages/api/tickets/__tests__/pricing.test.ts` for a thorough example.

## Reference handlers

| Pattern | Example |
|---|---|
| User session + Zod | `src/pages/api/cfp/submissions/index.ts` |
| Admin (cookie + bot) | `src/pages/api/admin/tickets.ts` |
| Service role webhook | `src/pages/api/webhooks/stripe.ts` |
| Public + rate limit | `src/pages/api/newsletter/subscribe.ts` |
| Stripe checkout session | `src/pages/api/checkout/create-session.ts` |
