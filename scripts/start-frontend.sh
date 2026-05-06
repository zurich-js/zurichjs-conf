#!/usr/bin/env bash
set -euo pipefail

scripts/require-docker.sh

base_url="${NEXT_PUBLIC_BASE_URL:-http://localhost:${APP_PORT:-3000}}"
export NEXT_PUBLIC_BASE_URL="$base_url"

port="$(
  NEXT_PUBLIC_BASE_URL="$base_url" scripts/base-url-port.sh
)"

export PORT="$port"

exec pnpm exec next dev -H 0.0.0.0 -p "$port"
