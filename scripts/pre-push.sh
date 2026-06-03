#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

scripts/docker-run.sh scripts/pre-push-in-docker.sh

echo
echo "Pre-push checks OK."
