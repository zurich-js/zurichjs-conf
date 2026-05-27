#!/usr/bin/env bash
# Fast Docker-local precheck for AI agents.
#
# Runs:
#   1. Varlock env/schema validation
#   2. oxlint on the whole repo (it's < 1s for 900+ files; not worth scoping)
#   3. tsc --noEmit on the whole project (must be repo-wide for type resolution)
#   4. vitest related on changed TS/TSX files (skipped if none)
#
# The --staged flag only changes which set of changed files is fed to step 3.
#
# Usage:
#   scripts/agent-precheck.sh
#   scripts/agent-precheck.sh --staged   # only check staged files

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

MODE="${1:-}"

if [[ "$MODE" == "--staged" ]]; then
  CHANGED="$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)"
else
  CHANGED="$(git diff --name-only HEAD --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)"
fi

echo "==> Varlock"
scripts/docker-run.sh pnpm exec varlock load

echo
echo "==> Lint"
scripts/docker-run.sh pnpm exec oxlint --fix

echo
echo "==> Typecheck"
scripts/docker-run.sh pnpm exec tsc --noEmit

echo
if [[ -z "$CHANGED" ]]; then
  echo "==> Tests (no changed TS/TSX files — skipping vitest related)"
else
  echo "==> Tests (related to changed files)"
  # shellcheck disable=SC2086
  scripts/docker-run.sh pnpm exec vitest related --run $CHANGED
fi

echo
echo "Precheck OK."
