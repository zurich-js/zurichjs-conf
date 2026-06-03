#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export HOST_PROJECT_PATH="$(pwd)"

if [[ "$#" -eq 0 ]]; then
  set -- bash
fi

find_web_container() {
  local containers
  containers="$(docker ps \
    --filter "label=com.docker.compose.service=web" \
    --filter "label=com.docker.compose.project.working_dir=$(pwd)" \
    --format '{{.ID}}')"
  printf '%s\n' "$containers" | sed -n '1p'
}

if ! web_container="$(find_web_container)"; then
  echo "Unable to inspect Docker containers. Is Docker running?" >&2
  exit 1
fi

if [[ -z "$web_container" ]]; then
  echo "Docker web container is not running. Starting the local Docker environment..."
  scripts/docker-dev.sh -d

  echo "Waiting for the web container to accept commands..."
  for _ in {1..60}; do
    web_container="$(find_web_container)"
    if [[ -n "$web_container" ]] && docker exec "$web_container" sh -lc 'test -d node_modules/.pnpm' >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

if [[ -z "$web_container" ]]; then
  echo "Docker web container did not start." >&2
  exit 1
fi

tty_args=(-i)
if [[ -t 0 && -t 1 ]]; then
  tty_args=(-it)
fi

exec docker exec "${tty_args[@]}" "$web_container" \
  sh -lc '
    marker="/tmp/zurichjs-conf-pnpm-11.1.1-ready"
    if [ ! -f "$marker" ]; then
      corepack enable
      corepack prepare pnpm@11.1.1 --activate
      pnpm config set store-dir /pnpm/store
      touch "$marker"
    fi
    unset NODE_ENV
    exec "$@"
  ' sh "$@"
