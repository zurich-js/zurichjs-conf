#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

STAGED_TS_FILES="$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)"

echo "==> Varlock"
scripts/docker-run.sh pnpm exec varlock load

echo
if [[ -z "$STAGED_TS_FILES" ]]; then
  echo "==> Lint (no staged TS/JS files - skipping)"
else
  echo "==> Lint (staged TS/JS files)"
  # shellcheck disable=SC2086
  scripts/docker-run.sh pnpm exec oxlint --fix $STAGED_TS_FILES
  # Re-stage files that oxlint fixed.
  # shellcheck disable=SC2086
  git add $STAGED_TS_FILES
fi

echo
echo "==> Typecheck"
scripts/docker-run.sh pnpm exec tsc --noEmit

echo
if [[ -z "$STAGED_TS_FILES" ]]; then
  echo "==> Tests (no staged TS/JS files - skipping related tests)"
else
  echo "==> Tests (related to staged TS/JS files)"
  # shellcheck disable=SC2086
  scripts/docker-run.sh pnpm exec vitest related --run $STAGED_TS_FILES
fi

echo
echo "Pre-commit checks OK."
