#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export SIMULATION_LAUNCHER_SOURCE_ONLY=1
source "$ROOT/scripts/start-adoption-simulation-macos.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_eq() { [ "$1" = "$2" ] || fail "expected '$2', got '$1'"; }

port_in_use() { return 1; }
web_is_ready() { return 1; }
admin_is_ready() { return 1; }
assert_eq "$(classify_existing_services)" "start"

port_in_use() { return 0; }
web_is_ready() { return 0; }
admin_is_ready() { return 0; }
assert_eq "$(classify_existing_services)" "reuse"

admin_is_ready() { return 1; }
assert_eq "$(classify_existing_services)" "conflict"

[ "${#ADMIN_LOGIN_PASSWORD}" -ge 12 ] || fail "local password too short"
[ "$(generate_secret | wc -c | tr -d ' ')" -eq 65 ] || fail "secret is not 64 hex chars"

killed=""
kill_owned_pid() { killed="$killed $1"; }
WEB_PID=101
ADMIN_PID=202
cleanup
assert_eq "$killed" " 101 202"

echo "launcher unit checks passed"
