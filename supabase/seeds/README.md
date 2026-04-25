# Local Seed Phases

`supabase/seed-local-cfp.sql` remains the default seed used by `supabase db reset`.

For phase-specific testing, use the npm scripts:

- `npm run db:seed:cfp-first-stage` — reviewer dashboard/load-test phase.
- `npm run db:seed:cfp-admission` — accepted/rejected speaker selection phase, no schedule.
- `npm run db:seed:cfp-schedule` — schedule slots and a few linked submissions, no commerce.
- `npm run db:seed:cfp-travel-ready` — schedule plus travel confirmations, transportation, and reimbursements.
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
- Accepted CFP submissions are promoted into `program_sessions`, and their
  primary/panel/workshop speakers are linked through `program_session_speakers`.
- Seeded schedule and workshop commerce rows link to `program_sessions.session_id`
  while retaining legacy `submission_id`/`cfp_submission_id` for compatibility.

### `cfp-first-stage`

- Purpose: reviewer workload and filtering before admissions decisions.
- Expected:
  - No workshop commerce data.
  - No schedule items.
  - No program sessions yet; submitted CFP rows remain intake/review records.
  - CFP submissions normalized to first-stage review state.
  - CFP-linked speakers hidden from the public lineup.
  - Invited/admin-managed speakers (no submissions) remain visible so the
    public speaker page still has a small curated lineup.

### `cfp-admission`

- Purpose: admissions/selection workflow with diversity in accepted speakers.
- Expected:
  - No schedule yet.
  - No workshop commerce data.
  - Accepted CFP rows have corresponding `program_sessions`, but those sessions
    are not scheduled yet.
  - Admissions decisions are present from base data (accepted/rejected/etc.).
  - CFP-linked accepted speakers become visible/admin-managed for lineup review.
  - Invited/admin-managed speakers remain visible and still have no sessions.

### `cfp-schedule`

- Purpose: scheduling workflow with partial placement.
- Expected:
  - Schedule exists with some sessions attached and open slots still available.
  - No workshop commerce data.
  - Session schedule rows link through `program_schedule_items.session_id`;
    legacy `submission_id` is still mirrored for compatibility.
  - Submissions linked to schedule items receive scheduled date/time/room.
  - CFP-linked accepted speakers remain visible/admin-managed.
  - At least one invited/admin-managed speaker remains without a session so you
    can test adding talks/workshops during scheduling.

### `cfp-travel-ready`

- Purpose: travel operations after selection and scheduling.
- Expected:
  - Scheduling state from `cfp-schedule` is preserved.
  - No workshop commerce data.
  - Multiple managed speakers have confirmed travel rows.
  - Travel and transportation timings are relative to the seed run date/time:
    - some legs already arrived or departed
    - some legs are within the next few hours
    - some legs are later today
    - some legs are on future days
  - Transportation data exists for inbound and outbound legs:
    - Flights with tracker links
    - Train itineraries
    - Link-only transport references
    - A local/no-travel example
  - Several reimbursement requests exist with mixed statuses and `receipt_url`
    attachments so the admin reimbursement queue is populated.
  - Travel metadata includes dinner / after-party / post-conf attendance so
    speaker travel planning screens are populated.

### `workshop-commerce`

- Purpose: post-scheduling local commerce workflow.
- Expected:
  - Full schedule and workshop/registration fixtures available.
  - Workshop offerings link through `workshops.session_id`; legacy
    `cfp_submission_id` is still retained for compatibility.
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
