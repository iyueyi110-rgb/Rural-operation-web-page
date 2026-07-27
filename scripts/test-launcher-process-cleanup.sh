#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLEANUP_SCRIPT="$ROOT_DIR/scripts/launcher-process-cleanup.sh"
TEST_PORT="${TEST_PORT:-43991}"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required for this test" >&2
  exit 1
fi

node -e "require('http').createServer((_, res) => res.end('ok')).listen(Number(process.argv[1]), '127.0.0.1')" "$TEST_PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 50); do
  if lsof -tiTCP:"$TEST_PORT" -sTCP:LISTEN -Pn >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

if ! lsof -tiTCP:"$TEST_PORT" -sTCP:LISTEN -Pn >/dev/null 2>&1; then
  echo "test server did not bind to port $TEST_PORT" >&2
  exit 1
fi

"$CLEANUP_SCRIPT" "$TEST_PORT"
wait "$SERVER_PID" >/dev/null 2>&1 || true

if lsof -tiTCP:"$TEST_PORT" -sTCP:LISTEN -Pn >/dev/null 2>&1; then
  echo "expected cleanup script to stop listener on port $TEST_PORT" >&2
  exit 1
fi

echo "launcher process cleanup test passed"
