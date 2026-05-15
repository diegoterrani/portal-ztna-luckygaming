#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMMIT_SHA="${VITE_GIT_COMMIT:-$(git rev-parse HEAD)}"
export VITE_GIT_COMMIT="$COMMIT_SHA"

echo "==> Building production assets"
echo "    VITE_GIT_COMMIT=$VITE_GIT_COMMIT"
npm run build

echo "==> Build finished at: $ROOT_DIR/dist"
