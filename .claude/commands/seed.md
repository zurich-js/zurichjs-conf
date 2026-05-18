---
description: Seed the local Supabase DB for a given phase
argument-hint: <cfp-first-stage | cfp-admission | cfp-schedule | workshop-commerce>
---

Seed local Supabase with phase data: `$ARGUMENTS`.

Phases:

- `cfp-first-stage` — Reviewer workload (submissions, reviewers, reviews, no decisions/schedule).
- `cfp-admission` — Admission workload (accepted/rejected/pending submissions, no schedule).
- `cfp-schedule` — Scheduling workload (schedule slots, linked submissions, no commerce).
- `workshop-commerce` — Full local seed including workshop commerce and registrations.

Run: `pnpm db:seed:$ARGUMENTS`

If `$ARGUMENTS` is empty or invalid, print the list of phases and stop.
