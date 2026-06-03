#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if [[ "$#" -eq 0 ]]; then
  set -- bash
fi

command="$*"

exec scripts/op-run.sh docker compose -f docker-compose.local.yml run --rm --no-deps web \
    sh -lc "corepack enable &&
      corepack prepare pnpm@11.1.1 --activate &&
      pnpm config set store-dir /pnpm/store &&
      pnpm install --frozen-lockfile &&
      exec ${command}"
