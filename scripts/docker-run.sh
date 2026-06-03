#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if [[ "$#" -eq 0 ]]; then
  set -- bash
fi

command="$*"
compose=(docker compose -f docker-compose.local.yml)

if ! scripts/op-run.sh "${compose[@]}" ps --status running --services | grep -qx web; then
  echo "Docker web container is not running. Starting the local Docker environment..."
  scripts/supabase-cli.sh start
  scripts/op-run.sh "${compose[@]}" up -d --build web

  echo "Waiting for the web container to accept commands..."
  for _ in {1..60}; do
    if scripts/op-run.sh "${compose[@]}" exec -T web sh -lc 'test -d node_modules/.pnpm' >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

exec scripts/op-run.sh "${compose[@]}" exec -T web \
  sh -lc "corepack enable &&
    corepack prepare pnpm@11.1.1 --activate &&
    pnpm config set store-dir /pnpm/store &&
    exec ${command}"
