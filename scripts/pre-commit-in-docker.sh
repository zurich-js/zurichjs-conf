#!/usr/bin/env bash
set -euo pipefail

cd /app

STAGED_TS_FILES=("$@")

echo "==> Varlock (skipped in pre-commit; run just varlock or just check-full)"

echo
if [[ "${#STAGED_TS_FILES[@]}" -eq 0 ]]; then
  echo "==> Lint (no staged TS/JS files - skipping)"
else
  echo "==> Lint (staged TS/JS files)"
  pnpm exec oxlint --fix "${STAGED_TS_FILES[@]}"
fi

echo
echo "==> Typecheck"
pnpm exec tsc --noEmit

echo
if [[ "${#STAGED_TS_FILES[@]}" -eq 0 ]]; then
  echo "==> Tests (no staged TS/JS files - skipping related tests)"
else
  echo "==> Tests (related to staged TS/JS files)"
  pnpm exec vitest related --run "${STAGED_TS_FILES[@]}"
fi
