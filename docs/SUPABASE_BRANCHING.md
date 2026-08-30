# Supabase Branching — staging before production

How to get a migration onto a Supabase branch, test it, and have it applied to
production only on merge.

## Why bother

Migrations in this repo currently reach production the moment they merge, and the
only pre-merge check is a local replay in CI (`.github/workflows/supabase-migrations.yml`).
That catches broken SQL. It does **not** catch a migration that is valid but wrong
against real data, an RLS policy that locks out the app, or a `SECURITY DEFINER`
function whose grants are subtly off — which is most of what the door check-in
migrations do.

A branch gives you a real hosted Postgres, provisioned from the same migration
history, that you can point a frontend at and break without consequence.

## Cost and plan

- **Pro plan or above.** Free does not include branching.
- **$0.01344 per branch per hour** at the default Micro compute — about **$0.32/day**,
  **~$9.70/month** for one always-on staging branch.
- Your $10 monthly compute credit does **not** offset branch compute.
- Branch usage counts against your plan quotas.

Per-PR preview branches only exist for the life of the PR, so they are cheap
individually — but they are **not** covered by your organisation's Spend Cap, and
they bill for as long as the PR stays open, not for as long as you use them.

**Watch out for stacked PRs.** "Supabase changes only" filters on whether a PR
touches `supabase/`, and a chained stack means every descendant inherits its
parent's migrations. The door check-in stack is 15 PRs, of which **14 touch
`supabase/`** — so that filter saves one branch, not fourteen. Fourteen branches
left open is roughly **$4.50/day**. Either merge a stack promptly, or turn
Automatic branching off while one is in flight and create branches by hand for
the PRs whose SQL you actually want to exercise.

## Setup

### 1. Enable the GitHub integration

Dashboard → **Project Settings → Integrations → GitHub → Authorize GitHub**, pick
`zurich-js/zurichjs-conf`, set **Working directory** to `.` (this repo has
`supabase/` at the root).

Turn on:

- **Deploy to production** — applies new migrations on merge to `main`. This is
  now the *only* thing that writes migrations to production; the `deploy` job was
  removed from `supabase-migrations.yml` precisely so there is one owner.
- **Supabase changes only** (optional) — only spin up a branch when files under
  `supabase/` actually changed, so a CSS-only PR does not cost a branch-hour.

### 2. Make the check required

GitHub → **Settings → Branches → branch protection for `main`** → add the Supabase
integration as a **required status check**.

This is the step that actually buys the safety. Without it, branching tells you a
migration failed and then lets you merge it anyway.

### 3. Optional: a persistent staging branch

Not required. With **Automatic branching** on, every PR that touches `supabase/`
already gets its own branch, seeded from `[db.seed]` — which is enough to test a
migration before it merges.

A persistent branch is worth the ~$9.70/month only if you want an environment
that **outlives a PR**: somewhere a deployed frontend can point at all week and
that keeps its data between tests. Preview branches are deleted when their PR
merges or closes.

```bash
supabase --experimental branches create staging --persistent
supabase --experimental branches list      # note the BRANCH PROJECT ID
```

### 4. Wire a persistent branch into `config.toml`

Only if you did step 3. Uncomment the `[remotes.staging]` block at the bottom of
`supabase/config.toml` and paste the ref.

Note the trap documented there: an absent or wrong `project_id` does **not** fail
loudly — Supabase silently skips the configuration step. Verify the seed actually
ran on the branch rather than assuming.

### 5. Point Vercel at the branches

**Do not set these by hand.** Every preview deployment needs the credentials of
*its own* branch database, and with automatic branching that is a different
database per pull request. A single Vercel "Preview" value cannot describe all of
them, and adding a per-branch override for each PR is not maintainable.

Install the **Supabase integration on Vercel** (Vercel marketplace → Supabase →
connect it to this project). It syncs the matching branch's credentials into each
preview deployment when the PR is opened. Supabase also redeploys the most recent
deployment for a PR afterwards, because there is a race between it writing the
variables and Vercel starting the build.

Requirements: the Vercel GitHub integration must also be connected, and the
Supabase project must be linked to the Vercel project.

#### Two name mismatches, already handled in code

The integration writes Supabase's older variable names. This app asks for the
newer ones, so two of the three would have been set and then ignored — and the
build would fail its env check on every preview:

| Integration writes | App reads |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | same ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` |

`src/config/env.ts` now falls back to the integration's names, preferring the
explicit ones when both are present. Covered by
`src/config/__tests__/env-aliases.test.ts`.

#### `NEXT_PUBLIC_BASE_URL` must not be inherited

This one is worth understanding rather than just accepting. `NEXT_PUBLIC_BASE_URL`
is normally set once at the project level, so it points at the production domain
in *every* environment — including previews.

That value builds the door staff magic-link redirect and the QR payload printed on
badges. On a preview it would mean a volunteer clicking their sign-in link lands
on the **production** app and signs in against the **production** database,
checking real attendees in while trying to rehearse.

`getBaseUrl()` now returns the deployment's own URL when `VERCEL_ENV` is
`preview`, and is unchanged everywhere else. It needs Vercel's
"Automatically expose System Environment Variables" setting left on (the
default). Covered by `src/lib/__tests__/url-preview.test.ts`.

#### What you still set manually in Vercel

Everything that is not Supabase and not per-branch — Stripe test keys, Resend,
`ADMIN_PASSWORD`, `ORDER_TOKEN_SECRET`, PostHog. Set those once on the **Preview**
environment. Use Stripe **test** keys there: a preview pointed at a branch
database with live Stripe keys can take real money.

## Seeding: the part that catches people out

**Branches start with no data.** That is deliberate — production PII must never
land on a preview instance — but it means a fresh staging branch has nothing to
scan, so the door station resolves every code to "not in today's roster" and the
whole flow looks broken.

`supabase/seeds/50-door-checkin.sql` is the fixture that fixes it. It is in the
default `[db.seed]` list, so **every** preview branch gets it — and so does local
`supabase db start`. It is also available on demand as:

```bash
pnpm db:seed:door-checkin
```

It creates seven conference tickets and four workshop seats, each covering a
specific branch of the door logic — a refunded ticket, a transferred ticket, a
partial goodie handover, an unnamed seat, a colleague's seat stamped with the
buyer's `ticket_id`, and a workshop-only attendee with an accented name. The
scannable QR payload is `${baseUrl}/validate/<ticket id>`, so the ids in that file
are the codes.

It is self-sufficient: it creates a workshop only when the catalogue is empty, so
it works both on a bare branch and layered on top of the CFP base seed. Both
paths are verified against a real Postgres with the full migration history.

Seed files are applied to branches and to local `supabase db start` only. They are
never applied to production, so these fixtures cannot leak into it.

## Testing the door flow on staging before September

One thing to know before you try: `door_current_occasion()` derives the occasion
from the **server** clock in Europe/Zurich, and returns `workshop_day` for any
date on or before **2026-09-10**, `conference_day` after it.

So testing on staging today exercises the **workshop-day** path only. To exercise
conference-day check-in before 11 September, either temporarily redefine
`door_current_occasion()` on the branch:

```sql
-- ON THE BRANCH ONLY. Never commit this.
CREATE OR REPLACE FUNCTION public.door_current_occasion()
RETURNS TEXT LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT 'conference_day' $$;
```

…or call the `door_*` functions directly in the SQL editor, where the occasion is
derived the same way but the fixtures let you assert on the result.

Re-apply the migration afterwards to put the real function back.

## What deploys on merge

Branching's production deploy applies:

- new migrations
- Edge Functions declared in `config.toml`
- Storage buckets declared in `config.toml`

It does **not** apply API config, Auth config, or seed files. That is a strict
superset of what the removed `supabase db push` job did.

## If a migration fails on a branch

Dependent steps are skipped — a failed migrate means the seed never runs, so an
empty branch after a deploy usually means the migration failed rather than the
seed. Read the deploy log on the branch, fix the migration, push again.

## Sources

- [Branching](https://supabase.com/docs/guides/deployment/branching)
- [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Branch configuration](https://supabase.com/docs/guides/deployment/branching/configuration)
- [Branching usage and cost](https://supabase.com/docs/guides/platform/manage-your-usage/branching)
