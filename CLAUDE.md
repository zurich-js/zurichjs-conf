# Claude Code Project Guide

ZurichJS Conference 2026 platform — Next.js 15 (Pages Router) + Supabase + Stripe.

This file is the canonical AI-agent rulebook. `AGENTS.md` and `.cursorrules` point here.
Most subdirectories also have their own scoped `CLAUDE.md` — read those when working in that area.

## Critical knowledge (read first)

- **Package manager: pnpm 11** — `package.json` enforces it. Never run `npm` or `yarn`.
- **Node version: 22** — see `.nvmrc`.
- **Linter is oxlint, not ESLint.** `pnpm lint` runs `oxlint --fix`.
- **Pages Router, not App Router.** Pages live in `src/pages/`. API routes in `src/pages/api/`.
- **Path alias: `@/*` → `src/*`** (see `tsconfig.json`). Use it for all imports — no relative `../../` chains.
- **Never hand-edit `src/lib/types/database.generated.ts`.** It's regenerated from Supabase.
- **Pre-commit is slow (~1-2 min).** It runs env-check + lint-staged + full test suite + typecheck + build. Plan for it; never bypass with `--no-verify`.
- **CFP closure gate:** new submissions must respect `isCfpClosed()` from `@/lib/cfp/closure`.

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (Pages Router) |
| Database / Auth | Supabase (Postgres + RLS) |
| Payments | Stripe (webhooks for fulfilment) |
| Email | Resend + React Email |
| Styling | Tailwind CSS v4 (`@theme` tokens in `globals.css`) |
| Server state | TanStack Query |
| URL state | nuqs |
| Forms | react-hook-form + zod |
| Analytics | PostHog (EU) via `@/lib/analytics` |
| Logging | `@/lib/logger` (scoped) |
| Icons | lucide-react (never inline SVG) |
| Tests | Vitest |
| Lint | oxlint |

## Commands

```bash
pnpm dev                 # Start dev server (port 3000)
pnpm build               # Production build
pnpm lint                # oxlint --fix
pnpm typecheck           # tsc --noEmit
pnpm test                # vitest (watch)
pnpm test:run            # vitest run (one shot)
pnpm test:related <files># vitest related --run (fast, scoped to changed files)
pnpm email:dev           # Preview email templates on :3001
pnpm db:seed:cfp-first-stage    # Seed CFP review phase
pnpm db:seed:cfp-admission      # Seed CFP admission phase
pnpm db:seed:cfp-schedule       # Seed CFP scheduling phase
pnpm db:seed:workshop-commerce  # Seed workshop commerce
```

When iterating: `pnpm test:related <changed-files>` + `pnpm typecheck` is much faster than `pnpm test:run`.

## Directory layout

```
src/
├── pages/              # Next.js pages and API routes (Pages Router)
│   ├── api/            # Backend endpoints — see src/pages/api/CLAUDE.md
│   ├── cfp/            # Speaker CFP pages
│   ├── admin/          # Admin dashboard pages
│   └── account/        # User account pages
├── components/         # Atomic Design — see src/components/CLAUDE.md
│   ├── atoms/          # Primitives (Button, Heading, Input)
│   ├── molecules/      # Compositions (Card, FormField, Modal)
│   ├── organisms/      # Page sections (Hero, Schedule)
│   ├── cfp/            # CFP-specific components
│   └── admin/          # Admin-specific components
├── lib/                # Domain logic — 37 subdirectories
│   ├── analytics/      # PostHog client + server
│   ├── cfp/            # CFP business logic — see src/lib/cfp/CLAUDE.md
│   ├── logger/         # Structured logging
│   ├── stripe/         # Payments + webhooks — see src/lib/stripe/CLAUDE.md
│   ├── supabase/       # DB clients — see src/lib/supabase/CLAUDE.md
│   ├── validations/    # Zod schemas
│   └── types/          # Domain types + generated DB types
├── hooks/              # Custom React hooks — see src/hooks/CLAUDE.md
├── contexts/           # React Context (Cart, Toast, Motion)
├── data/               # Static content — see src/data/CLAUDE.md
├── emails/             # React Email templates
├── config/             # env config, feature flags, pricing stages
└── styles/             # globals.css (Tailwind tokens)

supabase/
├── migrations/         # Timestamped SQL — see supabase/migrations/CLAUDE.md
└── seeds/              # Phase-based seed data
```

## Coding patterns

### TypeScript
- Strict mode. No `any` — use `unknown` + type guard if truly unknown.
- Explicit return types on exported functions.
- `interface` for component props (better error messages); `type` for unions.
- `as const` for data objects and literal arrays.
- Export prop types alongside components: `export type { ButtonProps } from './Button'`.

### Components (Atomic Design)
- **Atoms:** primitives, no business logic, no data fetching.
- **Molecules:** combinations of atoms; can manage internal state.
- **Organisms:** complete page sections; receive data via props, never fetch internally.
- Every component directory has an `index.ts` barrel export.
- Files should stay under 500 lines. New files: hard rule. Existing files > 700: refactor when touched. Generated files exempt.
- Use lucide-react for icons (never inline SVGs).
- Use `useMotion()` from `MotionContext` for framer-motion — respects `prefers-reduced-motion`.

### API routes (src/pages/api/)

Three auth patterns — pick the right one:

```typescript
// 1. User session (speaker, attendee) — respects RLS
import { createSupabaseApiClient } from '@/lib/cfp/auth';
const supabase = createSupabaseApiClient(req, res);
const { data: { session } } = await supabase.auth.getSession();
if (!session) return res.status(401).json({ error: 'Unauthorized' });

// 2. Admin (cookie OR bot API key)
import { verifyAdminAccess } from '@/lib/admin/auth';
const { authorized, isBot, botClient } = verifyAdminAccess(req);
if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

// 3. Service role (bypasses RLS — webhooks only, never user-context)
import { createServiceRoleClient } from '@/lib/supabase/client';
const supabase = createServiceRoleClient();
```

Standard handler shape:

```typescript
import { z } from 'zod';
import { logger } from '@/lib/logger';

const log = logger.scope('Resource API');

const schema = z.object({ /* ... */ });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Auth
  // 2. Method check
  // 3. Zod safeParse → 400 with issues
  // 4. Business logic
  // 5. try/catch with log.error(message, err, context)
}
```

### Logging
- Always `logger.scope('Module Name')` at file top, never `console.log`.
- `log.error(message, error, context)` — error and context get serialized for PostHog.
- Severity is inferred from level; structured metadata: `userId`, `submissionId`, etc.

### State management
- **Server state:** TanStack Query — hooks in `src/hooks/cfp/` and `src/hooks/`.
- **UI state:** React Context (cart, toast, motion).
- **URL state:** `nuqs` for shareable filters / pagination.

### Validation
- Zod schemas in `src/lib/validations/`.
- API routes always `safeParse`, return 400 with `result.error.issues` on failure.

### Accessibility (non-negotiable)
- Semantic HTML — `<button>`, `<nav>`, `<time>`, never `<div onClick>`.
- ARIA labels, visible focus rings, keyboard navigation (Tab/Enter/Escape/Arrow).
- `sr-only` for icon-only buttons.

### Hydration safety
- No `new Date()`, `Math.random()`, or browser APIs during render.
- For client-only content: `useEffect` + `isMounted` state, with SSR placeholder.

## Anti-patterns (do not do)

- Don't hand-edit `src/lib/types/database.generated.ts` — it's overwritten by `scripts/regen-db-types.sh`.
- Don't use `createServiceRoleClient()` in user-context API routes — it bypasses RLS.
- Don't trust client-supplied prices, ticket types, or order totals — validate server-side against `src/config/pricing-stages.ts` and Supabase.
- Don't bypass Zod validation on request bodies.
- Don't use `console.log` — use `logger.scope()`.
- `git commit --no-verify` is allowed in the Claude-on-the-web cloud sandbox (no `.env.local`, so pre-commit's build step always fails on env validation). Locally, fix the failing hook instead — don't bypass.
- Don't put static content in components — it lives in `src/data/`.
- Don't hardcode colors — use Tailwind `@theme` tokens or `src/styles/tokens.ts`.
- Don't add new types to `src/types/` — domain types belong in `src/lib/types/`.
- Don't create `*_SUMMARY.md` or planning docs after changes — PR descriptions live in PRs.
- Don't import from `'@/lib/types/cfp'` (legacy) when `'@/lib/types/cfp/...'` (organized) exists.

## CFP system at a glance

Submission state machine: `draft → submitted → under_review → shortlisted → accepted / rejected / waitlisted / withdrawn`

Roles: **speaker** (submits) | **reviewer** (rates) | **committee_member** (identity-revealed reviewer) | **admin** (full control)

Speaker routes live under `/api/cfp/`. Admin routes under `/api/admin/cfp/`. See `src/lib/cfp/CLAUDE.md`.

## Testing

- Vitest, Node environment.
- Tests live in `__tests__/` colocated with code.
- Use `pnpm test:related <files>` for fast iteration.
- Pre-commit runs the full suite; CI runs tests + coverage + lint + typecheck.

## When in doubt

1. Read the nearest scoped `CLAUDE.md`.
2. Check existing implementations in the same domain (e.g., look at another API route in the same folder).
3. Prefer extending existing patterns over inventing new ones.
4. For accessibility, motion, and hydration patterns the legacy `.cursorrules` has detailed examples worth skimming.

## Docs

- `docs/AGENT_PLAYBOOKS.md` — recipes for common tasks (new API route, new migration, etc.).
- `docs/ANALYTICS_AND_LOGGING.md` — full analytics/logging guide.
- `docs/WORKSHOPS_SUMMARY.md` — workshop subsystem overview.
- `README.md` — project setup.
