# Repo Map — ZurichJS Conference 2026

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (Pages Router) | 16.x |
| Runtime | React | 19.x |
| Language | TypeScript (strict) | 5.x |
| Node | Node.js | 22 (.nvmrc) |
| Database / Auth | Supabase (PostgreSQL 17) | 2.80 |
| Payments | Stripe | 19.x |
| Styling | Tailwind CSS v4 (CSS-first config) | 4.x |
| Server State | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Animations | Framer Motion | 12.x |
| Email | React Email + Resend | 0.5 / 6.x |
| Analytics | PostHog (client + server) | 1.297 |
| Error Tracking | Sentry | 10.x |
| Icons | lucide-react | 0.553 |

## Package Manager

npm with `package-lock.json`. No workspaces.

## Directory Structure

```
zurichjs-conf/
├── src/
│   ├── components/    # ~256 files, Atomic Design (atoms/molecules/organisms)
│   ├── lib/           # ~177 files, domain logic (stripe, cfp, tickets, discount, roles…)
│   ├── pages/         # 41 page files + 115 API routes
│   ├── hooks/         # 29 custom hooks
│   ├── contexts/      # 5 contexts (Cart, Currency, Motion, Toast)
│   ├── emails/        # 18+ React Email templates + design tokens
│   ├── data/          # Static data (hero, footer, sponsors, schedule)
│   ├── styles/        # globals.css (Tailwind v4 @theme), ProfileCard.css
│   ├── config/        # Currency, env, pricing stage config
│   └── types/         # Shared TypeScript types
├── supabase/
│   ├── config.toml    # Local dev config
│   └── migrations/    # 35 SQL migrations (~2,500 lines)
├── docs/              # Analytics, CFP, component integration guides
├── .github/workflows/ # CI (ci.yml)
└── .husky/            # Pre-commit hooks
```

## Testing Stack

- **Framework**: Vitest 4.x with `@vitest/coverage-v8`
- **Config**: `vitest.config.mts` — node environment, path aliases, v8 coverage
- **Existing tests**: 5 suites covering CFP scoring/decisions, Stripe webhook handlers, social handle validation, ticket pricing API
- **Scripts**: `test`, `test:run`, `test:coverage`, `test:related`

## Linting & Formatting

- **ESLint 9** (flat config) extending `next/core-web-vitals` + `next/typescript`
- Max 550 lines per file (warn), exemptions for generated types and test files
- **No standalone Prettier config** — formatting via ESLint
- **Husky pre-commit**: env check → lint-staged → test:run → typecheck → build
- **lint-staged**: eslint --fix + vitest related on staged .ts/.tsx/.js/.jsx files

## CI (GitHub Actions)

File: `.github/workflows/ci.yml`

Three jobs, all running in parallel on ubuntu-latest with Node 20:

| Job | Command | Caches |
|-----|---------|--------|
| test | `npm ci` → `npm run test:run` → `test:coverage` → upload artifact | npm |
| lint | `npm ci` → `npm run lint` | npm |
| typecheck | `npm ci` → `npm run typecheck` | npm |

**Issues identified**:
- `npm ci` runs 3 times (once per job) with no shared cache
- No `build` job — build only runs in pre-commit hook
- No path filters — all jobs run on every PR regardless of changes
- Tests run twice in the test job (test:run then test:coverage)
- Node 20 in CI but .nvmrc specifies 22

## Supabase Setup

- **Project ID**: `svkbzhlrjujeteqjrckv`
- **Migrations**: 35 files in `supabase/migrations/` (Jan 2025 → Feb 2026)
- **Config**: `supabase/config.toml` (PostgreSQL 17, local dev ports)
- **Clients**: Browser client, SSR client, CFP-specific client
- **Generated types**: `src/lib/supabase/database.types.ts` (~65 KB)
- **RLS**: Row Level Security policies in dedicated migration files
- **No CI check**: Migrations are not validated in CI
- **No production schema comparison**: No drift detection

## Key Observations

1. **Testing coverage is ~30%** of critical business logic. Payment checkout, ticket creation, role guards, discount system, and rate limiting have zero tests.
2. **CI is functional but not optimized** — no dependency caching across jobs, no build verification, redundant test runs.
3. **Supabase migrations have no CI validation** — drift, ordering, and destructive changes are not caught automatically.
4. **Design system is well-structured** but relies on convention rather than enforcement — Tailwind v4 CSS variables are the source of truth for tokens.
5. **Pre-commit hook is heavy** — runs full test suite + build on every commit, which is duplicated (partially) in CI.
