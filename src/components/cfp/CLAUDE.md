# CFP components — `src/components/cfp/`

Speaker- and reviewer-facing CFP UI. Composed on pages in `src/pages/cfp/`.

## Subdirectories

| Dir | Purpose |
|---|---|
| `submit/` | New-submission wizard — step components (type, details, speaker, review) |
| `edit-submission/` | Edit-existing-submission UI |
| `profile/` | Speaker profile editor (bio, socials, photo, t-shirt size, travel) |
| `reviewer/` | Reviewer dashboard, scoring components, filter bar |

Top-level files:
- `ReviewGuide.tsx` — modal explaining the scoring guidelines
- `Skeleton.tsx` — loading skeleton for submission cards

## Submit wizard pattern

The submit flow is a multi-step wizard. Each step is its own component and owns
its slice of the form (react-hook-form). Step transitions go through a parent
that holds the merged form state and a `currentStep` index.

Validation is enforced step-by-step via Zod schemas from `@/lib/validations/cfp`.

When adding a step:
1. Create `submit/MyStep.tsx`
2. Add a sub-schema in `@/lib/validations/cfp` (compose with `.extend()`)
3. Wire into the parent step machine
4. Update the closure check — the parent must call `isCfpClosed()` and gate the wizard

## Data hooks

Speaker-facing components fetch via hooks in `src/hooks/cfp/`:

- `useSubmissions()` — speaker's own submissions list
- `useSpeakerProfile()` — current speaker's profile
- `useTravel()` — travel plan
- `useBookmarks()` — saved drafts

Reviewer-facing components use:
- `useReviewerDashboard()` — assigned submissions, stats
- `useReviewerSubmissions()` — single submission for review

These hooks wrap TanStack Query against the speaker / reviewer API routes.

## Anonymity rules

Reviewer UI shows submissions **without** speaker identifying info unless the
reviewer's role is `committee_member` (then identity is revealed). This is
enforced at the API layer too, but UI components should never display
`speaker.name`/`email` in reviewer contexts unless explicitly approved by the
parent page.

## Form patterns

- `react-hook-form` for state.
- `@hookform/resolvers/zod` for validation.
- Field-level analytics via `useFormFieldTracking()` from `src/hooks/`.
- Word-count limits enforced in Zod schemas (`@/lib/validations/cfp` has helpers).

## Reference components

- `submit/TypeStep.tsx` — wizard step pattern
- `reviewer/DashboardComponents.tsx` (613 LOC, refactor when next touched)
- `profile/SpeakerProfileForm.tsx` — full form with image upload + travel section
