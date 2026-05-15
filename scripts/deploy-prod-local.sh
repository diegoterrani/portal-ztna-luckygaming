#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/zta-portal}"
NGINX_RELOAD_CMD="${NGINX_RELOAD_CMD:-sudo systemctl reload nginx}"

if [[ ! -d "$DEPLOY_DIR" ]]; then
  echo "ERROR: deploy directory does not exist: $DEPLOY_DIR" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "==> Step 1/4: lint"
npm run lint

echo "==> Step 2/4: build"
"$ROOT_DIR/scripts/build-prod.sh"

echo "==> Step 3/4: sync dist -> $DEPLOY_DIR"
sudo rsync -av --delete "$ROOT_DIR/dist/" "$DEPLOY_DIR/"

echo "==> Step 4/4: reload nginx"
sudo nginx -t
eval "$NGINX_RELOAD_CMD"

echo "==> Deploy complete"
