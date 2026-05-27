# Agent Playbooks

Recipes for common tasks. Each playbook lists the exact files to touch and the
pattern to follow.

If a task isn't listed here, fall back to the nearest scoped `CLAUDE.md` and an
existing example in the same domain.

---

## Add a new API route

**Goal:** add a new endpoint, e.g. `POST /api/cfp/submissions/[id]/bookmark`.

1. **Pick the auth pattern.** See `src/pages/api/CLAUDE.md`. For a speaker-owned
   action, use `createSupabaseApiClient(req, res)`.
2. **Add the Zod schema** in `src/lib/validations/cfp.ts` (or the relevant file).
3. **Create the route file** at `src/pages/api/cfp/submissions/[id]/bookmark.ts`.
   Mirror an existing handler — `src/pages/api/cfp/submissions/[id]/withdraw.ts`
   is a good template.
4. **Scope the logger:** `const log = logger.scope('CFP Bookmark API');`
5. **Add a test** in `src/pages/api/cfp/submissions/[id]/__tests__/` (if the dir
   doesn't exist, create it). Mock the Supabase client at the boundary.
6. **Wire the client call** in `src/lib/cfp/api.ts` (fetch wrapper).
7. **Wire the hook** in `src/hooks/cfp/useSubmissions.ts` (or a new hook).
8. **Run:** `just test-related src/pages/api/cfp/submissions/[id]/bookmark.ts &&
   just typecheck`.

---

## Add a new Supabase migration

**Goal:** add a column or table to the schema.

1. **Scaffold:** `/migrate-new add_speaker_pronouns` (or write the file manually
   with a UTC timestamp greater than the latest existing migration).
2. **Write SQL.** New tables MUST enable RLS in the same file with at least one
   policy. See `supabase/migrations/CLAUDE.md` for the template.
3. **Apply locally:** `supabase db push` (or via the seed scripts).
4. **Regenerate types:** `scripts/regen-db-types.sh` (or `/regen-db-types`).
5. **Run typecheck:** `just typecheck` — fix any drift.
6. **Update domain code** in `src/lib/<domain>/` to use the new column/table.
7. **Commit** the migration AND the regenerated `database.generated.ts`
   together.

---

## Add a new admin tab

**Goal:** add a new section to the admin dashboard (e.g. "Coffee Sponsors").

1. **Add the page** at `src/pages/admin/coffee-sponsors.tsx` — mirror an existing
   admin page; use `useAdminAuth()` and standard `AdminLoadingScreen` /
   `AdminLoginForm`.
2. **Add the tab component** at `src/components/admin/coffee-sponsors/CoffeeSponsorsTab.tsx`.
3. **Add API routes** under `src/pages/api/admin/coffee-sponsors/`. Use
   `verifyAdminAccess` for auth.
4. **Add hooks** in `src/hooks/` that wrap fetching for the tab.
5. **Add query keys** in `src/lib/queries/`.
6. **Add types** in `src/lib/types/coffee-sponsors.ts` (or a subdirectory if it
   grows).
7. **Wire the tab** into the admin tab bar (`AdminTabBar` or wherever the parent
   page declares its tabs).

---

## Add a new Zod-validated form field

**Goal:** add a "pronouns" field to the speaker profile.

1. **Add to the Zod schema** in `src/lib/validations/cfp.ts` (e.g. `pronouns: z.string().max(40).optional()`).
2. **Update the form component** in `src/components/cfp/profile/` to register the field with `react-hook-form`.
3. **Add the database column** via a new migration (see above).
4. **Update the API handler** in `src/pages/api/cfp/speaker/index.ts` if it needs
   to read/write the new field (Zod should already do most of the work).
5. **Regenerate DB types** so the field flows through to typed queries.

---

## Add a new Stripe webhook handler

**Goal:** handle a new Stripe event (e.g. `customer.subscription.updated`).

1. **Add a handler** in `src/lib/stripe/webhookHandlers.ts`. Make it idempotent —
   check for an existing record by event id / subscription id before writing.
2. **Wire it** into the dispatch in `src/pages/api/webhooks/stripe.ts`.
3. **Add fixture tests** in `src/lib/stripe/__tests__/webhookHandlers.test.ts`.
4. **Use the service-role client** — webhooks are not user-authenticated.

---

## Track a new analytics event

**Goal:** capture `submission_bookmarked` when a speaker bookmarks a submission.

1. **Add to `events.ts`:**
   ```typescript
   submission_bookmarked: { submission_id: string };
   ```
2. **Capture:**
   - Client: `analytics.capture('submission_bookmarked', { submission_id })`.
   - Server: `serverAnalytics.capture('submission_bookmarked', { submission_id }, { distinctId: userId })`.
3. **Don't log it via `logger.info()`** — analytics events are not logs.

---

## Refactor a file that exceeds 500 lines

**Goal:** bring a 700-line modal down without breaking it.

1. **Identify the seams.** Look for inline sub-components, form sections, column
   definitions, helper functions.
2. **Extract sibling files** in the same directory. Keep the public export
   surface (the main component) identical.
3. **Run tests** at every step. Refactor in small commits; don't rewrite from
   scratch.
4. **Update the barrel** (`index.ts`) to re-export the new sub-components only if
   they're consumed externally — keep most extractions private.

---

## Investigate a failing local check

Local validation is explicit rather than Git-hook driven.

- **Env/schema failure:** new `process.env.X` reference without an entry in
  `.env.schema`. Add the var and run the Varlock check.
- **Lint failure:** run `just lint` to auto-fix; commit the result.
- **Test failure:** run `just test-related <file>` to scope. Fix the test or the
  code.
- **Typecheck failure:** run `just typecheck` and read the error. Often a missing
  `database.generated.ts` regen.
- **Build failure:** run `just build`; usually a Next.js-specific
  issue (image domain, dynamic route param missing).

---

## Quick agent precheck before claiming done

```bash
scripts/agent-precheck.sh
```

Runs lint + typecheck + vitest related on changed files. Takes ~10-30s. Use this
for a quick local validation pass.
