#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${CI:-}" || -f /.dockerenv ]]; then
  exit 0
fi

cat >&2 <<'EOF'
This command is not allowed on the host.

Use the justfile/Docker command surface instead:
  just dev
  just lint
  just typecheck
  just test
  just build

CI may still run package scripts directly.
EOF

exit 1
