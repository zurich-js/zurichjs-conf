#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

output_file="${1:-.env.docker.local}"

if ! command -v op >/dev/null 2>&1; then
  echo "1Password CLI (op) is required to resolve local Docker environment values." >&2
  echo "Install and sign in to op, then rerun this command." >&2
  exit 1
fi

if [[ ! -f .env.schema ]]; then
  echo "Missing .env.schema. Committed environment defaults and 1Password references are required." >&2
  exit 1
fi

combined_env_file="$(mktemp)"
tmp_env_file="$(mktemp)"
resolved_env_file="$(mktemp)"
trap 'rm -f "$combined_env_file" "$tmp_env_file" "$resolved_env_file"' EXIT

cp .env.schema "$combined_env_file"

cat >>"$combined_env_file" <<'EOF'

# Docker-local defaults. These intentionally override deploy-oriented schema
# fallbacks, while an ignored .env can still override them below.
APP_ENV=development
PORT=3003
CI=false
NEXT_PUBLIC_BASE_URL=http://localhost:3003
NEXT_PUBLIC_SITE_URL=http://localhost:3003
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_INTERNAL_URL=http://supabase-bridge:54321
EOF

if [[ -f .env ]]; then
  cat .env >>"$combined_env_file"
fi

awk '
  /^[[:space:]]*($|#)/ { next }
  {
    line = $0
    sub(/^[[:space:]]*export[[:space:]]+/, "", line)
    key = line
    sub(/[[:space:]]*=.*/, "", key)
    order[key] = ++seen
    value[key] = line
  }
  END {
    for (i = 1; i <= seen; i++) {
      for (key in order) {
        if (order[key] == i) {
          print value[key]
        }
      }
    }
  }
' "$combined_env_file" >"$tmp_env_file"

env_names=()
while IFS='=' read -r name _; do
  env_names+=("$name")
done <"$tmp_env_file"

op run --env-file="$tmp_env_file" -- bash -c '
  set -euo pipefail
  output_file="$1"
  shift
  : >"$output_file"
  for name in "$@"; do
    printf "%s=%s\n" "$name" "${!name-}" >>"$output_file"
  done
' bash "$resolved_env_file" "${env_names[@]}"

mv "$resolved_env_file" "$output_file"
chmod 600 "$output_file"

echo "Resolved Docker environment: $output_file"
