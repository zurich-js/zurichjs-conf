#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "==> Build"
scripts/docker-run.sh pnpm exec next build

echo
echo "Pre-push checks OK."
