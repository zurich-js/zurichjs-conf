# Custom hooks — `src/hooks/`

Custom React hooks. Two kinds:

1. **Server state hooks** — wrap TanStack Query against API routes.
2. **UI / browser state hooks** — local state, refs, browser APIs.

## Server state (TanStack Query)

CFP-specific server-state hooks live in `src/hooks/cfp/`. Others (workshops,
sponsors, program) live at the top level.

Convention:

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries';
import { fetchMyResource } from '@/lib/<domain>/api';

export function useMyResource(id: string) {
  return useQuery({
    queryKey: queryKeys.myResource.byId(id),
    queryFn: () => fetchMyResource(id),
    enabled: !!id,
  });
}
```

- **Query keys** are centralized in `src/lib/queries/` — add new keys there.
- **Fetch functions** live in `src/lib/<domain>/api.ts`, not inside the hook.
- **Mutations** use `useMutation` + `invalidateQueries` with the matching key.

## UI / browser hooks

| Hook | What |
|---|---|
| `useToast()` | Toast notifications (Context-based) |
| `useTabs()` | Tab state |
| `useCountdown()` | Countdown timer with hydration-safe rendering |
| `useKeyboardShortcuts()` | Keyboard event listeners |
| `useLocalStorage()` | `use-local-storage-state` wrapper |
| `usePrefersReducedMotion()` | A11y preference |
| `useGridPacker()` | Layout packing |
| `useFeatureFlags()` | Feature flag checks |

## Cart / checkout

- `useCartUrlState()` — shareable cart URLs via `nuqs`
- `useCartAbandonment()` — abandoned-cart tracking with PostHog
- `useCheckout()` — checkout flow state
- `useFormFieldTracking()` — field-level analytics

## Auth

- `useAdminAuth()` — admin session check
- `useCfp()` — CFP eligibility for current user
- `useStudentVerification()` — student verification flow

## Naming

- `useXxx` for hooks (lint enforces this).
- Return objects, not tuples, when there's more than one value.
- Expose `isLoading` / `error` from query hooks (don't hide them).

## When to add a new hook

- The state logic is reused in **two or more** components.
- A component is approaching the file-size limit and extracting state helps.
- The logic touches a browser API and needs SSR-safe wrapping.

Otherwise, just inline `useState` / `useEffect`.

## URL state (nuqs)

Prefer `nuqs` over `useState` when the state should:
- Be shareable via URL (filters, search, pagination, selected tab).
- Survive a page refresh.

```typescript
import { useQueryState } from 'nuqs';
const [status, setStatus] = useQueryState('status');
```

## Hydration safety

Browser-only state (`localStorage`, `window`, `navigator`) must run in `useEffect`,
never in render. Use `useState(initial)` + `useEffect(() => setX(loadFromStorage()))`.

## Tests

Hooks live without tests today. When adding test coverage, use Vitest with
`@testing-library/react-hooks` or by mounting a tiny test component — see whether
the repo has added such a setup before adding it yourself.
