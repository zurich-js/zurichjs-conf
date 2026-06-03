#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if command -v docker >/dev/null 2>&1; then
  docker logout public.ecr.aws >/dev/null 2>&1 || true
fi

resolved_env_file="$(mktemp)"
trap 'rm -f "$resolved_env_file"' EXIT

scripts/resolve-docker-env.sh "$resolved_env_file"
export COMPOSE_ENV_FILE="$resolved_env_file"

docker compose -f docker-compose.local.yml down --remove-orphans
scripts/supabase-cli.sh start

docker compose -f docker-compose.local.yml up --build "$@"
