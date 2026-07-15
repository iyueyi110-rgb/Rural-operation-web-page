#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export SIMULATION_LAUNCHER_SOURCE_ONLY=1
source "$ROOT/scripts/start-adoption-simulation-macos.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }
wait_for_file() {
  attempt=0
  while [ "$attempt" -lt 100 ]; do
    [ -s "$1" ] && return 0
    attempt=$((attempt + 1))
    sleep 0.02
  done
  return 1
}

TEST_TMP="$(mktemp -d)"
LOOPBACK_PORT_FILE="$TEST_TMP/loopback.port"
python3 -c '
import socket, sys, time
s = socket.socket()
s.bind(("127.0.0.1", 0))
s.listen()
open(sys.argv[1], "w").write(str(s.getsockname()[1]))
time.sleep(30)
' "$LOOPBACK_PORT_FILE" &
LOOPBACK_PID=$!
wait_for_file "$LOOPBACK_PORT_FILE" || fail "loopback listener did not start"
LOOPBACK_PORT="$(cat "$LOOPBACK_PORT_FILE")"
if ! listener_is_local "$LOOPBACK_PORT"; then
  kill "$LOOPBACK_PID" >/dev/null 2>&1 || true
  wait "$LOOPBACK_PID" >/dev/null 2>&1 || true
  rm -rf "$TEST_TMP"
  fail "real loopback listener was rejected"
fi
kill "$LOOPBACK_PID" >/dev/null 2>&1 || true
wait "$LOOPBACK_PID" >/dev/null 2>&1 || true

WILDCARD_PORT_FILE="$TEST_TMP/wildcard.port"
python3 -c '
import socket, sys, time
s = socket.socket()
s.bind(("0.0.0.0", 0))
s.listen()
open(sys.argv[1], "w").write(str(s.getsockname()[1]))
time.sleep(30)
' "$WILDCARD_PORT_FILE" &
WILDCARD_PID=$!
wait_for_file "$WILDCARD_PORT_FILE" || fail "wildcard listener did not start"
WILDCARD_PORT="$(cat "$WILDCARD_PORT_FILE")"
if listener_is_local "$WILDCARD_PORT"; then
  kill "$WILDCARD_PID" >/dev/null 2>&1 || true
  wait "$WILDCARD_PID" >/dev/null 2>&1 || true
  rm -rf "$TEST_TMP"
  fail "real wildcard listener was accepted"
fi
kill "$WILDCARD_PID" >/dev/null 2>&1 || true
wait "$WILDCARD_PID" >/dev/null 2>&1 || true

rm -rf "$TEST_TMP"
echo "launcher listener checks passed"
