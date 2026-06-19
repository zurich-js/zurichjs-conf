# Admin components — `src/components/admin/`

UI for the admin dashboard. Composed in `src/pages/admin/*` pages.

## Auth wrapping

Admin pages use `useAdminAuth()` (`src/hooks/useAdminAuth.ts`) which checks the
admin cookie session. If the user is not authenticated, render `AdminLoginForm`
instead of the protected content.

Pattern:

```typescript
const { authenticated, loading } = useAdminAuth();
if (loading) return <AdminLoadingScreen />;
if (!authenticated) return <AdminLoginForm />;
return <ActualAdminPage />;
```

## Layout primitives

| Component | Purpose |
|---|---|
| `AdminHeader` | Top bar with logout |
| `AdminTabBar` | Tab navigation between admin sections |
| `AdminModal` | Standard modal shell — use this for all admin modals |
| `AdminLoadingScreen` | Spinner during auth check |
| `AdminEmptyState`, `AdminErrorState` | Standard empty/error UI |

Always use these — don't roll bespoke admin chrome.

## Tab pattern

Each top-level admin section is a tab component in its own subdirectory:

- `cfp/SubmissionsTab.tsx`, `cfp/SpeakersTab.tsx`, `cfp/ReviewersTab.tsx`
- `tickets/...`
- `workshops/...`
- `sponsorships/...`
- `partnerships/...`
- `b2b/...`
- `program/...`
- `vip-perks/...`
- `cfp-travel/...`

Tabs fetch their own data via TanStack Query hooks and render large data tables /
modals.

## File-size hot spots

Several admin modals exceed the 500-line rule and should be split when touched:

- `workshops/WorkshopAdminModal.tsx` (903 LOC)
- `workshops-registrants/WorkshopsRegistrantsTab.tsx` (840 LOC)
- `cfp/SubmissionsTab.tsx` (690 LOC)
- `speakers/ScheduleItemModal.tsx` (644 LOC)
- `cfp/tabs/ReviewersTab.tsx` (626 LOC)

When refactoring, extract column definitions, modal sub-panels, and form sections
into sibling files.

## Shared admin utilities

`shared/` has cross-tab helpers (action buttons, confirm dialogs). Prefer adding
to `shared/` over duplicating across tabs.

## Data flow

- Tabs use admin-specific TanStack Query hooks (e.g. data fetched via `fetchSubmissions`
  in `@/lib/cfp/api.ts`).
- Mutations: optimistic updates where safe; otherwise invalidate query keys from
  `@/lib/queries/`.
- Toast feedback via `useToast()`.

## Bot-mode awareness

Some admin endpoints can be hit by a read-only bot (Authorization Bearer key).
Admin UI doesn't need to think about this — it's a backend concern — but be aware
when adding new admin endpoints (see `src/pages/api/CLAUDE.md`).
