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

Per-PR preview branches only exist for the life of the PR, so they are cheap; a
persistent staging branch is the recurring cost.

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

### 3. Create a persistent staging branch

```bash
supabase --experimental branches create staging --persistent
supabase --experimental branches list      # note the BRANCH PROJECT ID
```

**Persistent, not preview.** Preview branches are per-PR and are deleted when the
PR merges or closes — fine for reviewing one migration, useless as a staging
environment you want to keep seeded and pointed at by a deployed frontend.

### 4. Wire the branch into `config.toml`

Uncomment the `[remotes.staging]` block at the bottom of `supabase/config.toml`
and paste the ref from step 3.

Note the trap documented there: an absent or wrong `project_id` does **not** fail
loudly — Supabase silently skips the configuration step. Verify the seed actually
ran on the branch rather than assuming.

### 5. Point a frontend at it

Each branch has its own API URL and anon key (Dashboard → the branch → Project
Settings → API). Put them in a Vercel **Preview** environment as
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus
`SUPABASE_SERVICE_ROLE_KEY` for the server-side paths (the roster endpoint and
the `door_*` RPC wrappers both need it).

## Seeding: the part that catches people out

**Branches start with no data.** That is deliberate — production PII must never
land on a preview instance — but it means a fresh staging branch has nothing to
scan, so the door station resolves every code to "not in today's roster" and the
whole flow looks broken.

`supabase/seeds/50-door-checkin.sql` is the fixture that fixes it. It is wired
into `[remotes.staging.db.seed]` so a branch gets it automatically, and it is
available locally as:

```bash
pnpm db:seed:door-checkin
```

It creates seven conference tickets and four workshop seats, each covering a
specific branch of the door logic — a refunded ticket, a transferred ticket, a
partial goodie handover, an unnamed seat, a colleague's seat stamped with the
buyer's `ticket_id`, and a workshop-only attendee with an accented name. The
scannable QR payload is `${baseUrl}/validate/<ticket id>`, so the ids in that file
are the codes.

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
