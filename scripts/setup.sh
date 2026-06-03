#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

required_commands=(docker op just)
required_env_vars=(
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_SECRET_KEY
  STRIPE_SECRET_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_WEBHOOK_SECRET
  RESEND_API_KEY
  ADMIN_PASSWORD
  ORDER_TOKEN_SECRET
)

echo "Checking required host tools..."
for command_name in "${required_commands[@]}"; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required. Install Docker Desktop or the docker compose plugin." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed, but the daemon is not running." >&2
  exit 1
fi

if [[ ! -f .env.1password ]]; then
  echo "Missing .env.1password. Local development secrets must be referenced through 1Password." >&2
  exit 1
fi

echo "Checking 1Password CLI session..."
if ! op whoami >/dev/null 2>&1; then
  echo "1Password CLI is not signed in, or this shell is not authorized." >&2
  echo "Run 'op signin' or open the 1Password app integration, then retry." >&2
  exit 1
fi

echo "Checking required 1Password-backed environment values..."
op run --env-file=.env.1password -- bash -c '
  set -euo pipefail
  missing=0
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      echo "Missing or empty environment value: $name" >&2
      missing=1
    fi
  done
  exit "$missing"
' bash "${required_env_vars[@]}"

echo "Configuring Git hooks..."
git config core.hooksPath .githooks

echo "Starting Docker development environment..."
scripts/docker-dev.sh -d

echo
echo "Setup complete. App: http://localhost:3003"
