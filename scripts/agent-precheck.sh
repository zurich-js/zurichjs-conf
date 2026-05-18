#!/usr/bin/env bash
# Fast precheck for AI agents — a subset of pre-commit that runs in ~10-30s.
# Use this to validate work before claiming a task is done, instead of running
# the full pre-commit suite (which builds the whole project).
#
# Runs:
#   1. oxlint on changed files
#   2. tsc --noEmit
#   3. vitest related on changed TS/TSX files (skipped if none)
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

echo "==> Lint"
pnpm lint

echo
echo "==> Typecheck"
pnpm typecheck

echo
if [[ -z "$CHANGED" ]]; then
  echo "==> Tests (no changed TS/TSX files — skipping vitest related)"
else
  echo "==> Tests (related to changed files)"
  # shellcheck disable=SC2086
  pnpm test:related $CHANGED
fi

echo
echo "Precheck OK. Full pre-commit will also run a build."
