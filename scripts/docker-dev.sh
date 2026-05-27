#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if ! command -v op >/dev/null 2>&1; then
  echo "1Password CLI (op) is required to start local Docker development." >&2
  echo "Install and sign in to op, then rerun this command." >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  docker logout public.ecr.aws >/dev/null 2>&1 || true
fi

op run --env-file=.env.1password -- docker compose -f docker-compose.local.yml down --remove-orphans
scripts/supabase-cli.sh start

exec op run --env-file=.env.1password -- docker compose -f docker-compose.local.yml up --build "$@"
