#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v supabase >/dev/null 2>&1; then
  exec supabase "$@"
fi

host_project_path="$(pwd)"
tty_args=(-i)
if [[ -t 0 && -t 1 ]]; then
  tty_args=(-it)
fi

if [[ "$#" -eq 0 ]]; then
  set -- --help
fi

docker run --rm "${tty_args[@]}" \
  -e PNPM_HOME=/pnpm \
  -w "$host_project_path" \
  -v "$host_project_path:$host_project_path" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v zurichjs-conf_supabase-cli:/root/.supabase \
  -v zurichjs-conf_pnpm-store:/pnpm/store \
  node:22-bookworm \
  sh -lc 'corepack enable &&
    corepack prepare pnpm@11.1.1 --activate &&
    pnpm config set store-dir /pnpm/store &&
    pnpm dlx supabase@latest "$@"' supabase "$@"
