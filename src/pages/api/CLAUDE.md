# API routes — `src/pages/api/`

Next.js Pages Router API handlers. ~150 routes split across speaker (`/api/cfp/*`),
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

## Standard handler shape

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const log = logger.scope('My Resource API');

const bodySchema = z.object({
  title: z.string().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Auth (one of the three patterns above)

  // 2. Method check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. Validate
  const result = bodySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
  }

  // 4. Business logic
  try {
    // ...
    return res.status(200).json({ ok: true });
  } catch (err) {
    log.error('Failed to do thing', err, { /* context */ });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

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
