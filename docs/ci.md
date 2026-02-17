# CI Pipeline

## Overview

CI runs on GitHub Actions (`.github/workflows/ci.yml`) for every push to `main` and every PR targeting `main`.

## Pipeline Structure

```
                    ┌─────────┐
                    │  Push/PR │
                    └────┬─────┘
                         │
           ┌─────────────┼─────────────────────┐
           │             │                      │
      ┌────▼────┐  ┌────▼─────┐  ┌────▼────┐  ┌──▼──────────────┐
      │  Lint   │  │Typecheck │  │  Test   │  │Supabase Migrations│
      │ (ESLint)│  │  (tsc)   │  │(Vitest) │  │  (SQL checks)    │
      └────┬────┘  └────┬─────┘  └────┬────┘  └──────────────────┘
           │             │             │
           └─────────────┼─────────────┘
                         │
                    ┌────▼────┐
                    │  Build  │
                    │(Next.js)│
                    └─────────┘
```

**Lint, Typecheck, Test, and Supabase Migrations** run in parallel.
**Build** runs only after lint, typecheck, and test all pass.

## Jobs

### lint

Runs `npm run lint` (ESLint with Next.js and TypeScript rules).

Catches: unused variables, missing types, style violations, files over 550 lines.

### typecheck

Runs `npm run typecheck` (`tsc --noEmit` in strict mode).

Catches: type errors, missing imports, interface mismatches.

### test

Runs `npm run test:coverage` (Vitest with v8 coverage).

Uploads coverage report as artifact (14-day retention).

Catches: broken business logic, regression in scoring/pricing/roles/discount/rate-limit.

### build

Runs `npm run build` (Next.js production build).

Depends on lint + typecheck + test passing first. Uses dummy environment variables so no secrets are needed.

Catches: build errors, SSR/import issues, missing modules, broken pages.

### supabase-migrations

Validates migration files without needing a running database:

1. **Ordering check**: Verifies all migration filenames follow `YYYYMMDDHHMMSS_description.sql` format and are in chronological order.
2. **Destructive operation detection** (PRs only): Warns when migrations contain `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or similar operations.
3. **Basic SQL validation**: Checks for unmatched parentheses and empty files.

## Running Checks Locally

```bash
# Run the same checks CI runs (fast checks first)
npm run lint
npm run typecheck
npm run test:run

# Full build (slower)
npm run build
```

## Configuration Details

### Node Version

CI uses Node 22 (matching `.nvmrc`).

### Dependency Caching

All jobs use `actions/setup-node@v4` with `cache: 'npm'` which caches `~/.npm` between runs. Each job still runs `npm ci` but downloads are cached.

### Concurrency

The workflow uses concurrency groups to cancel in-progress runs when a new commit is pushed to the same PR/branch. This prevents wasted compute on superseded commits.

### Build Environment

The build job provides placeholder environment variables so `next build` succeeds without real API keys. No actual API calls are made during build.

## Adding New Jobs

When adding a new CI job:

1. Add it to the `jobs` section in `.github/workflows/ci.yml`
2. Use the same Node setup pattern (checkout → setup-node → npm ci)
3. If it should block build, add its name to the `needs` array of the build job
4. If it's fast and independent, run it in parallel (no `needs`)
5. Document it in this file
