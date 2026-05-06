#!/usr/bin/env bash
set -euo pipefail

if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  exit 0
fi

if [ "${VERCEL:-}" = "1" ]; then
  exit 0
fi

if [ "${IN_DOCKER:-}" = "1" ] || [ -f "/.dockerenv" ]; then
  exit 0
fi

cat >&2 <<'EOF'
This repository does not run Node, pnpm, Supabase, or app scripts on the host.

Use Docker-only entrypoints instead:
  just setup
  just dev
  just test
  just typecheck
  docker compose run --rm tools pnpm test:run
  docker compose exec frontend pnpm dev

There is no local bypass for this guard.
EOF

exit 1
