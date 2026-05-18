#!/usr/bin/env bash
# SessionStart hook — fast repo health check shown to the agent on session start.
# Wired up via .claude/settings.json hooks block (see Claude Code docs).
#
# Keep this fast (< 2s) and read-only.

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "## Repo status"
echo
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'no git')"

if [[ -f .nvmrc ]]; then
  expected_node="$(sed 's/^v//' .nvmrc | tr -d '[:space:]')"
  actual_node="$(node --version 2>/dev/null | sed 's/^v//' || echo 'missing')"
  if [[ "$actual_node" != "$expected_node"* ]]; then
    echo "Node: v$actual_node (expected v$expected_node — run \`nvm use\`)"
  else
    echo "Node: v$actual_node OK"
  fi
fi

if [[ -f package.json ]]; then
  pkg_mgr="$(node -e "console.log((require('./package.json').packageManager||'').split('@')[0]||'')" 2>/dev/null || echo "")"
  if [[ "$pkg_mgr" == "pnpm" ]]; then
    echo "Package manager: pnpm (don't use npm/yarn)"
  fi
fi

if [[ -f .env.example && ! -f .env.local && ! -f .env ]]; then
  echo "WARNING: .env.example exists but .env.local is missing — many commands will fail."
fi

uncommitted="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${uncommitted:-0}" -gt 0 ]]; then
  echo "Uncommitted changes: $uncommitted file(s)"
fi

ahead_behind="$(git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo "")"
if [[ -n "$ahead_behind" ]]; then
  ahead="$(echo "$ahead_behind" | awk '{print $1}')"
  behind="$(echo "$ahead_behind" | awk '{print $2}')"
  if [[ "$ahead" != "0" || "$behind" != "0" ]]; then
    echo "vs upstream: $ahead ahead, $behind behind"
  fi
fi

echo
echo "Read CLAUDE.md first. Scoped guidance lives in nested CLAUDE.md files."
