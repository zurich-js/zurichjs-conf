#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"
export COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-/dev/null}"

scripts/supabase-cli.sh stop || true
docker compose -f docker-compose.local.yml down --remove-orphans
