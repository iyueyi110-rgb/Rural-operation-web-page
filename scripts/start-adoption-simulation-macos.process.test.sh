#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export SIMULATION_LAUNCHER_SOURCE_ONLY=1
source "$ROOT/scripts/start-adoption-simulation-macos.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_eq() { [ "$1" = "$2" ] || fail "expected '$2', got '$1'"; }
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
DESCENDANTS_FILE="$TEST_TMP/descendants.pid"
bash -c 'trap "" TERM; bash -c '\''trap "" TERM; sleep 30 & echo "$$ $!" >"$1"; wait'\'' _ "$1" & wait' _ "$DESCENDANTS_FILE" &
WEB_PID=$!
wait_for_file "$DESCENDANTS_FILE" || fail "owned descendants did not start"
WEB_CHILD_PID="$(awk '{print $1}' "$DESCENDANTS_FILE")"
WEB_GRANDCHILD_PID="$(awk '{print $2}' "$DESCENDANTS_FILE")"
ADMIN_PID=""
SHUTDOWN_GRACE_SECONDS=0.05

LISTED_DESCENDANTS="$(list_owned_descendants "$WEB_PID")"
printf '%s\n' "$LISTED_DESCENDANTS" | grep -qx "$WEB_CHILD_PID" || fail "child PID missing from owned descendant snapshot"
printf '%s\n' "$LISTED_DESCENDANTS" | grep -qx "$WEB_GRANDCHILD_PID" || fail "grandchild PID missing from owned descendant snapshot"

cleanup
sleep 0.1
if kill -0 "$WEB_PID" >/dev/null 2>&1 || kill -0 "$WEB_CHILD_PID" >/dev/null 2>&1 || kill -0 "$WEB_GRANDCHILD_PID" >/dev/null 2>&1; then
  kill -KILL "$WEB_PID" "$WEB_CHILD_PID" "$WEB_GRANDCHILD_PID" >/dev/null 2>&1 || true
  wait "$WEB_PID" >/dev/null 2>&1 || true
  WEB_PID=""
  rm -rf "$TEST_TMP"
  fail "cleanup left an owned process-tree member running"
fi
WEB_PID=""
rm -rf "$TEST_TMP"

TEST_TMP="$(mktemp -d)"
LATE_CHILD_FILE="$TEST_TMP/late-child.pid"
bash -c 'trap '\''sleep 30 & echo "$!" >"$1"'\'' TERM; while :; do sleep 1; done' _ "$LATE_CHILD_FILE" 2>/dev/null &
WEB_PID=$!
ADMIN_PID=""
SHUTDOWN_GRACE_SECONDS=0.1
cleanup
wait_for_file "$LATE_CHILD_FILE" || fail "TERM trap did not create the late descendant"
LATE_CHILD_PID="$(cat "$LATE_CHILD_FILE")"
if kill -0 "$LATE_CHILD_PID" >/dev/null 2>&1; then
  kill -KILL "$LATE_CHILD_PID" >/dev/null 2>&1 || true
  WEB_PID=""
  rm -rf "$TEST_TMP"
  fail "cleanup missed a descendant created during shutdown"
fi
WEB_PID=""
rm -rf "$TEST_TMP"

TEST_TMP="$(mktemp -d)"
ADMIN_CHILD_FILE="$TEST_TMP/admin-child.pid"
bash -c 'sleep 0.1; exit 7' &
WEB_PID=$!
bash -c 'trap "" TERM; sleep 30 & echo "$!" >"$1"; wait' _ "$ADMIN_CHILD_FILE" &
ADMIN_PID=$!
wait_for_file "$ADMIN_CHILD_FILE" || fail "supervised Admin descendant did not start"
ADMIN_CHILD_PID="$(cat "$ADMIN_CHILD_FILE")"
SUPERVISOR_POLL_SECONDS=0.02
SHUTDOWN_GRACE_SECONDS=0.05

supervisor_status=0
supervise_services || supervisor_status=$?
assert_eq "$supervisor_status" "7"
sleep 0.1
if kill -0 "$ADMIN_PID" >/dev/null 2>&1 || kill -0 "$ADMIN_CHILD_PID" >/dev/null 2>&1; then
  fail "supervisor left Admin running after Web exited"
fi
WEB_PID=""
ADMIN_PID=""
rm -rf "$TEST_TMP"

TEST_TMP="$(mktemp -d)"
LOG_DIR="$TEST_TMP"
bash -c 'exit 0' &
WEB_PID=$!
bash -c 'sleep 30' &
ADMIN_PID=$!
SUPERVISOR_POLL_SECONDS=0.02
SHUTDOWN_GRACE_SECONDS=0.05

supervisor_status=0
supervise_services 2>"$TEST_TMP/supervisor.err" || supervisor_status=$?
assert_eq "$supervisor_status" "1"
grep -q 'Web.*web\.log' "$TEST_TMP/supervisor.err" || fail "supervisor did not identify the exited Web service and log"
WEB_PID=""
ADMIN_PID=""
rm -rf "$TEST_TMP"

TEST_TMP="$(mktemp -d)"
SIGNAL_ROOT_FILE="$TEST_TMP/root.pid"
SIGNAL_CHILD_FILE="$TEST_TMP/child.pid"
SIGNAL_READY_FILE="$TEST_TMP/ready"
bash -c '
  export SIMULATION_LAUNCHER_SOURCE_ONLY=1
  source "$1"
  SHUTDOWN_GRACE_SECONDS=0.05
  bash -c '\''trap "" TERM; sleep 30 & echo "$!" >"$1"; wait'\'' _ "$2" &
  WEB_PID=$!
  echo "$WEB_PID" >"$3"
  echo ready >"$4"
  while :; do sleep 1; done
' _ "$ROOT/scripts/start-adoption-simulation-macos.sh" "$SIGNAL_CHILD_FILE" "$SIGNAL_ROOT_FILE" "$SIGNAL_READY_FILE" &
SIGNAL_LAUNCHER_PID=$!
wait_for_file "$SIGNAL_READY_FILE" || fail "signal test launcher did not start"
wait_for_file "$SIGNAL_ROOT_FILE" || fail "signal test root did not start"
wait_for_file "$SIGNAL_CHILD_FILE" || fail "signal test child did not start"
SIGNAL_ROOT_PID="$(cat "$SIGNAL_ROOT_FILE")"
SIGNAL_CHILD_PID="$(cat "$SIGNAL_CHILD_FILE")"
kill -TERM "$SIGNAL_LAUNCHER_PID"

attempt=0
while kill -0 "$SIGNAL_LAUNCHER_PID" >/dev/null 2>&1 && [ "$attempt" -lt 100 ]; do
  attempt=$((attempt + 1))
  sleep 0.02
done
if kill -0 "$SIGNAL_LAUNCHER_PID" >/dev/null 2>&1; then
  kill -KILL "$SIGNAL_LAUNCHER_PID" >/dev/null 2>&1 || true
fi
signal_status=0
wait "$SIGNAL_LAUNCHER_PID" || signal_status=$?
assert_eq "$signal_status" "143"
if kill -0 "$SIGNAL_ROOT_PID" >/dev/null 2>&1 || kill -0 "$SIGNAL_CHILD_PID" >/dev/null 2>&1; then
  kill -KILL "$SIGNAL_ROOT_PID" "$SIGNAL_CHILD_PID" >/dev/null 2>&1 || true
  rm -rf "$TEST_TMP"
  fail "TERM handler left an owned process-tree member running"
fi
rm -rf "$TEST_TMP"

echo "launcher process checks passed"
