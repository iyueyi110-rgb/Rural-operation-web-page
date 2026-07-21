#!/usr/bin/env bash
set -euo pipefail

# Finder 入口：唯一实现位于 scripts/，此文件仅负责解析仓库根目录。
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$ROOT_DIR/scripts/走马村云脑系统.command" "$@"
