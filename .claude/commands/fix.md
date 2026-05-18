---
description: Fast precheck — typecheck + lint + related tests on changed files
---

Run the fast feedback loop on the current changes:

1. `git diff --name-only HEAD` to find changed `.ts`/`.tsx` files.
2. `pnpm exec tsc --noEmit` for typecheck.
3. `pnpm lint` (oxlint --fix).
4. `pnpm test:related <changed files>` for scoped tests.

If anything fails, fix it before reporting back. Skip step 4 if there are no changed `.ts`/`.tsx` files.

Don't run `pnpm test:run` (full suite) unless the user asks — pre-commit runs that.
