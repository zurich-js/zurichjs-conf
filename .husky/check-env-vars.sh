#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)
ENV_EXAMPLE="${REPO_ROOT}/.env.example"

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "⚠ .env.example not found — skipping env var check"
  exit 0
fi

DIFF=$(git diff --cached --diff-filter=ACMR -U0 -- ':!.husky/check-env-vars.sh')

if [ -z "$DIFF" ]; then
  exit 0
fi

# Extract process.env.FOO and process.env['FOO'] / process.env["FOO"]
ALL_VARS=$(echo "$DIFF" \
  | grep '^+' \
  | grep -v '^+++' \
  | grep -oE "process\.env(\.[A-Z][A-Z0-9_]{2,}|\[['\"][A-Z][A-Z0-9_]{2,}['\"])" \
  | sed "s/process\.env\.//" \
  | sed "s/process\.env\['//" \
  | sed "s/process\.env\[\"//" \
  | sed "s/'$//" \
  | sed "s/\"$//" \
  | sed "s/\]$//" \
  | sort -u)

if [ -z "$ALL_VARS" ]; then
  exit 0
fi

KNOWN_VARS=$(grep -oE '^[A-Z][A-Z0-9_]+' "$ENV_EXAMPLE" | sort -u)

FOUND_MISSING=0
for VAR in $ALL_VARS; do
  # Skip if it doesn't look like an env var (safety net)
  case "$VAR" in
    [A-Z][A-Z0-9_]*) ;;
    *) continue ;;
  esac

  if ! echo "$KNOWN_VARS" | grep -qx "$VAR"; then
    if [ "$FOUND_MISSING" -eq 0 ]; then
      echo ""
      echo "================================================="
      echo "⚠  New env var(s) NOT in .env.example:"
      echo ""
      FOUND_MISSING=1
    fi
    echo "   • $VAR"
  fi
done

if [ "$FOUND_MISSING" -eq 1 ]; then
  echo ""
  echo "  Please add them to .env.example with a placeholder."
  echo "================================================="
  echo ""
  exit 1
fi

exit 0