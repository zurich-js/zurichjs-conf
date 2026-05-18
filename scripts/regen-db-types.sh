#!/usr/bin/env bash
# Regenerate src/lib/types/database.generated.ts from the linked Supabase project.
#
# Requires:
#   - Supabase CLI installed (`brew install supabase/tap/supabase` or `npm i -g supabase`)
#   - `supabase link --project-ref <ref>` already run, OR pass SUPABASE_PROJECT_ID
#
# Usage:
#   scripts/regen-db-types.sh                  # uses linked project or local
#   SUPABASE_PROJECT_ID=xyz scripts/regen-db-types.sh
#   scripts/regen-db-types.sh --local          # generate from local Supabase

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

OUTPUT="src/lib/types/database.generated.ts"
MODE="${1:-}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI not installed. Install with: brew install supabase/tap/supabase" >&2
  exit 1
fi

if [[ "$MODE" == "--local" ]]; then
  echo "Generating from local Supabase..."
  supabase gen types typescript --local > "$OUTPUT"
elif [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "Generating from project: $SUPABASE_PROJECT_ID"
  supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > "$OUTPUT"
else
  echo "Generating from linked project..."
  supabase gen types typescript --linked > "$OUTPUT"
fi

echo "Wrote $OUTPUT ($(wc -l < "$OUTPUT") lines)"
echo "Run \`pnpm typecheck\` to check for schema drift."
