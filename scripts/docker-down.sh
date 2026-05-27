#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

scripts/supabase-cli.sh stop || true
op run --env-file=.env.1password -- docker compose -f docker-compose.local.yml down --remove-orphans
