#!/usr/bin/env bash
# ------------------------------------------------------------
# One‑time env‑var checker – portable version (works on macOS, Linux)
# ------------------------------------------------------------

# Repo root (works even when run from a sub‑directory)
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT" || exit 1

ENV_EXAMPLE="${REPO_ROOT}/.env.example"

# Bail out early if the reference file is missing
if [[ ! -f "$ENV_EXAMPLE" ]]; then
  echo "⚠ .env.example not found — skipping env‑var check"
  exit 0
fi

# -----------------------------------------------------------------
# 1️⃣  Gather *all* process.env occurrences in tracked source files
# -----------------------------------------------------------------
#   - `git ls-files -z` prints a NUL‑terminated list (portable)
#   - `xargs -0` reads that NUL list safely on any Unix
#   - Exclude typical binary / generated paths (node_modules, dist …)
# -----------------------------------------------------------------
ALL_VARS=$(git ls-files -z \
  | grep -zvE "(/|^)(node_modules|dist|build|\.git|\.hg|\.svn|\.cache|\.next)/" \
  | xargs -0 -I{} grep -aEoh "process\.env(\.[A-Z][A-Z0-9_]{2,}|\[['\"][A-Z][A-Z0-9_]{2,}['\"])" "{}" \
  | sed -E "s/^process\.env\.//;s/^process\.env\['//;s/^process\.env\[\"//;s/'$//;s/\"$//;s/\]$//" \
  | sort -u)

# If nothing was found, exit quietly
if [[ -z "$ALL_VARS" ]]; then
  exit 0
fi

# ------------------------------------------------------------
# 2️⃣  Load the list of known vars from .env.example
# ------------------------------------------------------------
KNOWN_VARS=$(grep -oE '^[A-Z][A-Z0-9_]+' "$ENV_EXAMPLE" | sort -u)

# ------------------------------------------------------------
# 3️⃣  Compare and report missing entries
# ------------------------------------------------------------
FOUND_MISSING=0
while IFS= read -r VAR; do
  # Safety net – ignore anything that doesn't look like an env var
  [[ $VAR =~ ^[A-Z][A-Z0-9_]*$ ]] || continue

  if ! grep -qx "$VAR" <<<"$KNOWN_VARS"; then
    if (( FOUND_MISSING == 0 )); then
      echo ""
      echo "================================================="
      echo "⚠  New env var(s) NOT in .env.example:"
      echo ""
      FOUND_MISSING=1
    fi
    echo "   • $VAR"
  fi
done <<<"$ALL_VARS"

if (( FOUND_MISSING == 1 )); then
  echo ""
  echo "  Please add them to .env.example with a placeholder."
  echo "================================================="
  echo ""
  exit 1
fi

exit 0