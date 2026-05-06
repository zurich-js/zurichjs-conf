#!/usr/bin/env bash
set -euo pipefail

scripts/require-docker.sh

env_example=".env.example"

if [ ! -f "$env_example" ]; then
  echo ".env.example is missing." >&2
  exit 1
fi

used_vars="$(
  git grep -h -o -E "process\.env(\.[A-Z][A-Z0-9_]{2,}|\[['\"][A-Z][A-Z0-9_]{2,}['\"]\])" -- . \
    ':!pnpm-lock.yaml' \
    ':!node_modules' \
    | sed -E "s/process\.env\.//; s/process\.env\[['\"]//; s/['\"]\]//" \
    | sort -u
)"

known_vars="$(
  grep -oE '^[A-Z][A-Z0-9_]+' "$env_example" | sort -u
)"

missing="$(
  comm -23 <(printf '%s\n' "$used_vars") <(printf '%s\n' "$known_vars")
)"

if [ -z "$missing" ]; then
  echo ".env.example covers all process.env variables."
  exit 0
fi

cat >&2 <<'EOF'
The following process.env variables are used in the repo but missing from .env.example:

EOF

printf '%s\n' "$missing" >&2

cat >&2 <<'EOF'

Add each variable to .env.example with an empty or placeholder value.
EOF

exit 1
