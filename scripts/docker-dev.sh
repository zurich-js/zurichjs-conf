#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if command -v docker >/dev/null 2>&1; then
  docker logout public.ecr.aws >/dev/null 2>&1 || true
fi

scripts/op-run.sh docker compose -f docker-compose.local.yml down --remove-orphans
scripts/supabase-cli.sh start

exec scripts/op-run.sh docker compose -f docker-compose.local.yml up --build "$@"
