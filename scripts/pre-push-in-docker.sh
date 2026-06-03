#!/usr/bin/env bash
set -euo pipefail

cd /app

echo "==> Varlock"
pnpm exec varlock load

echo
echo "==> Build"
pnpm exec next build
