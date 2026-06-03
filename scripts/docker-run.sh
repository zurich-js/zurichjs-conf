#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if [[ "$#" -eq 0 ]]; then
  set -- bash
fi

compose=(docker compose -f docker-compose.local.yml)

if ! running_services="$(scripts/op-run.sh "${compose[@]}" ps --status running --services)"; then
  echo "Unable to inspect Docker Compose services. Is Docker running and is 1Password CLI connected?" >&2
  exit 1
fi

if ! grep -qx web <<<"$running_services"; then
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
  sh -lc '
    marker="/tmp/zurichjs-conf-pnpm-11.1.1-ready"
    if [ ! -f "$marker" ]; then
      corepack enable
      corepack prepare pnpm@11.1.1 --activate
      pnpm config set store-dir /pnpm/store
      touch "$marker"
    fi
    unset NODE_ENV
    exec "$@"
  ' sh "$@"
