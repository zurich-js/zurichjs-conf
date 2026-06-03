#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

scripts/supabase-cli.sh stop || true
scripts/op-run.sh docker compose -f docker-compose.local.yml down --remove-orphans
