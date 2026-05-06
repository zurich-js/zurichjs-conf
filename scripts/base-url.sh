#!/usr/bin/env bash
set -euo pipefail

base_url="${NEXT_PUBLIC_BASE_URL:-}"

if [ -z "$base_url" ] && [ -f ".env.local" ]; then
  base_url="$(
    grep -E '^NEXT_PUBLIC_BASE_URL=' .env.local \
      | tail -n 1 \
      | cut -d= -f2- \
      | sed -E 's/^["'\'']//; s/["'\'']$//' \
      || true
  )"
fi

printf '%s\n' "${base_url:-http://localhost:3000}"
