#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

STAGED_TS_FILES=()
while IFS= read -r file; do
  STAGED_TS_FILES+=("$file")
done < <(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [[ "${#STAGED_TS_FILES[@]}" -gt 0 ]]; then
  scripts/docker-run.sh scripts/pre-commit-in-docker.sh "${STAGED_TS_FILES[@]}"
  git add "${STAGED_TS_FILES[@]}"
else
  scripts/docker-run.sh scripts/pre-commit-in-docker.sh
fi

echo
echo "Pre-commit checks OK."
