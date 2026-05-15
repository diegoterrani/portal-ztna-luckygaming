#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_SOURCE="$ROOT_DIR/deploy/portal-admin-api.service"
SERVICE_TARGET="/etc/systemd/system/portal-admin-api.service"

echo "==> Installing systemd unit for Admin API"
sudo cp "$SERVICE_SOURCE" "$SERVICE_TARGET"
sudo systemctl daemon-reload
sudo systemctl enable --now portal-admin-api
sudo systemctl status portal-admin-api --no-pager
