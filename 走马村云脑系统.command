#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

clear || true
echo "========================================"
echo "  走马村云脑系统"
echo "========================================"
echo
echo "正在启动，请保持此窗口打开。"
echo

exec /bin/bash "$ROOT_DIR/start.sh"
