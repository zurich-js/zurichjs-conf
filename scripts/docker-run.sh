#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if ! command -v op >/dev/null 2>&1; then
  echo "1Password CLI (op) is required to run Docker commands with local secrets." >&2
  echo "Install and sign in to op, then rerun this command." >&2
  exit 1
fi

if [[ "$#" -eq 0 ]]; then
  set -- bash
fi

command="$*"

exec op run --env-file=.env.1password -- \
  docker compose -f docker-compose.local.yml run --rm --no-deps web \
    sh -lc "corepack enable &&
      corepack prepare pnpm@11.1.1 --activate &&
      pnpm config set store-dir /pnpm/store &&
      pnpm install --frozen-lockfile &&
      exec ${command}"
