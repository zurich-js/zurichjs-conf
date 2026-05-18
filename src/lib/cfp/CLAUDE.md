# CFP — `src/lib/cfp/`

Call for Papers system. The largest domain in this repo (~9k LOC across 20+ files).
Touches speakers, submissions, reviewers, scoring, travel logistics, and scheduling.

## Submission state machine

```
draft → submitted → under_review → shortlisted → accepted
                                              ↘ rejected
                                              ↘ waitlisted
                  → withdrawn (terminal, from any state)
```

Type: `CfpSubmissionStatus` in `src/lib/types/cfp/base.ts`. Always import from there —
status strings are not magic.

Transitions are gated:
- **Speaker** can: `draft → submitted`, `* → withdrawn` (own submissions only).
- **Reviewer / committee_member** can: rate, comment. Cannot change status.
- **Admin** can: any transition, including bulk operations via `admin.ts`.

## Roles

| Role | Capability |
|---|---|
| `speaker` | Submit, edit own draft, withdraw |
| `reviewer` | Read assigned submissions, score, comment (anonymous to speaker) |
| `committee_member` | Reviewer with identity revealed (recent role — see migration `20260413000000`) |
| `admin` | Everything |

## CFP closure

`closure.ts` exports `isCfpClosed()` and `CFP_CLOSED_ERROR_CODE`. Any endpoint that
creates a new submission must check this and reject with 403 when closed. The
closure date is sourced from `timelineData` in `@/data/timeline`.

## Module map

| File | Purpose |
|---|---|
| `auth.ts` | Magic-link login for speakers and reviewers; session helpers (`createSupabaseApiClient`, `createSupabaseServerClient`) |
| `auth-constants.ts` | Auth helpers (`isDuplicateKeyError`) used to handle Supabase `23505` |
| `submissions.ts` | Speaker-facing CRUD: list, create, update, status, withdraw |
| `speakers.ts` | Speaker profile, visibility, featured flag, image uploads |
| `reviews.ts` | Review CRUD, score aggregation |
| `reviewers.ts` | Reviewer roster, invites, activity |
| `reviewer-scoring.ts` | Pure score math — testable, no DB |
| `reviewer-permissions.ts` | Who can review what |
| `reviewer-navigation.ts` | "Next submission to review" logic |
| `scoring.ts` | Submission-side score helpers + shortlist classification |
| `admin.ts` | Admin bulk ops — status changes, decisions, ~1k LOC |
| `admin-travel.ts` | Travel reimbursement, flight management |
| `adminApi.ts` | Thin fetch wrappers used by admin UI |
| `decisions.ts` | Accept/reject/waitlist decision workflow |
| `scheduled-emails.ts` | Automated decision/reminder emails (~1k LOC) |
| `closure.ts` | CFP open/closed gate |
| `config.ts` | Submission limits, word limits, level options |
| `analytics.ts` | CFP stats for dashboards |
| `tags.ts` | Talk tag management |
| `travel.ts` | Speaker-facing travel helpers |
| `api.ts` | Public CFP fetchers (used by admin dashboard hooks) |

## Patterns

- Pure functions (`reviewer-scoring.ts`, `scoring.ts`) live in their own files and are
  covered by tests in `__tests__/`. Don't inline score math into handlers.
- DB-touching helpers take a Supabase client as the first arg (or use the singleton
  `createCfpServiceClient` for service-role ops).
- `logger.scope('CFP <area>')` is consistent — match what the surrounding file uses.

## Types

Prefer the organized location: `@/lib/types/cfp/...` (split into `base`, `entities`,
`reviews`, `decisions`, `travel`, `admin`, `public`, `config`).

The legacy aggregated files (`@/lib/types/cfp.ts`, `cfp-admin.ts`, `cfp-database.ts`)
still exist but new code should import from the subdirectory. See
`src/lib/types/CLAUDE.md`.

## Auth duplicate-key gotcha

Supabase returns `23505` on unique-constraint violations. Use
`isDuplicateKeyError(err)` from `auth-constants.ts` rather than checking the code
string directly.

## Speaker visibility

Speakers have a `visible` flag separate from submission status — a speaker can be
accepted but invisible (NDA, late confirmation). See migration `20251220000000_add_speaker_visibility.sql`.

## Tests

- `__tests__/scoring.test.ts` — score math edge cases
- `__tests__/decisions.test.ts` — decision workflow
- `__tests__/analytics.test.ts` — stat aggregation
- `__tests__/cfp-closure.test.ts` — closure gating
