#!/usr/bin/env bash
set -euo pipefail

if ! command -v lsof >/dev/null 2>&1; then
  echo "[WARN] lsof 不可用，无法自动清理端口占用。" >&2
  exit 0
fi

ports=("$@")
if [ "${#ports[@]}" -eq 0 ]; then
  ports=(3000 3001)
fi

for port in "${ports[@]}"; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN -Pn 2>/dev/null | sort -u || true)"
  if [ -z "$pids" ]; then
    echo "[OK]    端口 ${port} 未被占用"
    continue
  fi

  echo "[INFO]  正在关闭端口 ${port} 上的旧进程：$(echo "$pids" | tr '\n' ' ')"
  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
  done

  for _ in $(seq 1 30); do
    if ! lsof -tiTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done

  remaining="$(lsof -tiTCP:"$port" -sTCP:LISTEN -Pn 2>/dev/null | sort -u || true)"
  if [ -n "$remaining" ]; then
    echo "[WARN]  端口 ${port} 仍被占用，强制关闭：$(echo "$remaining" | tr '\n' ' ')"
    for pid in $remaining; do
      kill -9 "$pid" 2>/dev/null || true
    done
    sleep 0.5
  fi

  if lsof -tiTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1; then
    echo "[ERR]   端口 ${port} 清理失败，请手动检查占用进程。" >&2
    exit 1
  fi

  echo "[OK]    端口 ${port} 已释放"
done
