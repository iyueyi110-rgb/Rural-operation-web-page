#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export SIMULATION_LAUNCHER_SOURCE_ONLY=1
source "$ROOT/scripts/start-adoption-simulation-macos.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_eq() { [ "$1" = "$2" ] || fail "expected '$2', got '$1'"; }

EXPECTED_COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.simulation-macos.yml"
assert_eq "$COMPOSE_FILE" "$EXPECTED_COMPOSE_FILE"
[ -f "$ROOT/infra/docker/docker-compose.simulation-macos.yml" ] || fail "launcher compose file missing"
grep -q '127\.0\.0\.1:5432:5432' "$ROOT/infra/docker/docker-compose.simulation-macos.yml" || fail "PostgreSQL is not bound to loopback"
if grep -q 'redis' "$ROOT/infra/docker/docker-compose.simulation-macos.yml"; then
  fail "launcher compose file must not define Redis"
fi

CALLS_FILE="$(mktemp)"
TEST_LOG_DIR="$(mktemp -d)"
pnpm() { printf '%s\n' "$*" >>"$CALLS_FILE"; }
LOG_DIR="$TEST_LOG_DIR"
start_services
wait "$WEB_PID" "$ADMIN_PID"

grep -q '^--filter @zouma/web exec next dev --hostname 127\.0\.0\.1 --port 3000$' "$CALLS_FILE" || fail "Web launch is not explicitly bound to loopback"
grep -q '^--filter @zouma/admin exec next dev --hostname 127\.0\.0\.1 --port 3001$' "$CALLS_FILE" || fail "Admin launch is not explicitly bound to loopback"

ADMIN_API_TOKEN="test-token-must-not-appear-in-argv"
curl() {
  case " $* " in
    *"$ADMIN_API_TOKEN"*) return 90 ;;
  esac
  curl_config="$(cat)"
  case "$curl_config" in
    *"header = \"x-admin-token: $ADMIN_API_TOKEN\""*) ;;
    *) return 91 ;;
  esac
  printf '{"data":{"items":[]},"meta":{"backend":"prisma","degraded":false}}'
}
simulation_prisma_is_ready || fail "strict Prisma probe rejected a healthy Prisma response"

curl() {
  cat >/dev/null
  printf '{"data":{"items":[{"backend":"prisma","degraded":false}]},"meta":{"backend":"json","degraded":true}}'
}
if simulation_prisma_is_ready; then
  fail "strict Prisma probe accepted a degraded response"
fi

rm -rf "$CALLS_FILE" "$TEST_LOG_DIR"
WEB_PID=""
ADMIN_PID=""

echo "launcher config checks passed"
