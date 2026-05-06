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

base_url="${base_url:-http://localhost:3000}"

case "$base_url" in
  http://*:*|https://*:*)
    port="${base_url##*:}"
    port="${port%%/*}"
    ;;
  https://*)
    port="443"
    ;;
  *)
    port="80"
    ;;
esac

if ! [[ "$port" =~ ^[0-9]+$ ]]; then
  echo "Could not parse a port from NEXT_PUBLIC_BASE_URL=$base_url" >&2
  exit 1
fi

printf '%s\n' "$port"
