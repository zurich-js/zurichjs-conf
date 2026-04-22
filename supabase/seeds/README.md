# Local Seed Phases

`supabase/seed-local-cfp.sql` remains the default seed used by `supabase db reset`.

For phase-specific testing, use the npm scripts:

- `npm run db:seed:cfp-first-stage` — reviewer dashboard/load-test phase.
- `npm run db:seed:cfp-admission` — accepted/rejected speaker selection phase, no schedule.
- `npm run db:seed:cfp-schedule` — schedule slots and a few linked submissions, no commerce.
- `npm run db:seed:workshop-commerce` — full local seed with workshop commerce fixtures.

## Expected state by phase

All phase scripts start from `supabase/seed-local-cfp.sql`, then apply an
overlay to shape the dataset for a specific admin workflow.

### Base seed (`seed-local-cfp.sql`)

- Curated CFP data for local testing:
  - Many reviewers.
  - Many submissions (including generated load-test rows).
  - Many reviews with mixed scores and note density.
- Includes invited/admin-managed speakers with no CFP submissions:
  - 3 featured invited speakers.
  - 1 non-featured invited speaker.

### `cfp-first-stage`

- Purpose: reviewer workload and filtering before admissions decisions.
- Expected:
  - No workshop commerce data.
  - No schedule items.
  - CFP submissions normalized to first-stage review state.
  - CFP-linked speakers hidden from the public lineup.
  - Invited/admin-managed speakers (no submissions) remain visible so the
    public speaker page still has a small curated lineup.

### `cfp-admission`

- Purpose: admissions/selection workflow with diversity in accepted speakers.
- Expected:
  - No schedule yet.
  - No workshop commerce data.
  - Admissions decisions are present from base data (accepted/rejected/etc.).
  - CFP-linked accepted speakers become visible/admin-managed for lineup review.
  - Invited/admin-managed speakers remain visible and still have no sessions.

### `cfp-schedule`

- Purpose: scheduling workflow with partial placement.
- Expected:
  - Schedule exists with some sessions attached and open slots still available.
  - No workshop commerce data.
  - Submissions linked to schedule items receive scheduled date/time/room.
  - CFP-linked accepted speakers remain visible/admin-managed.
  - At least one invited/admin-managed speaker remains without a session so you
    can test adding talks/workshops during scheduling.

### `workshop-commerce`

- Purpose: post-scheduling local commerce workflow.
- Expected:
  - Full schedule and workshop/registration fixtures available.
  - CFP and invited speaker lineup behavior from prior phases is preserved.
  - Workshop Stripe connection fields are intentionally cleared:
    - `workshops.stripe_product_id = null`
    - `workshops.stripe_price_lookup_key = null`
  - This keeps commerce flows testable locally without live Stripe wiring.

Each phase script resets the local database without automatic seeding, applies
`seed-local-cfp.sql` through the local Postgres container, then applies the
phase overlay. The script continues past Supabase CLI post-reset restart hiccups
as long as the migrated database is reachable.

The scripts apply SQL through the local Supabase Postgres Docker container. If
your container name differs, set `SUPABASE_DB_CONTAINER`.
