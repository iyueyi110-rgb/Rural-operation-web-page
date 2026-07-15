#!/bin/bash
set -Eeuo pipefail

PROJECT_ROOT="/Users/limyoon/Desktop/aigc"
COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.simulation-macos.yml"
LOG_DIR="$PROJECT_ROOT/tmp/simulation-launcher"
DATABASE_URL="postgresql://zouma:zouma_dev@127.0.0.1:5432/zouma"
ADMIN_LOGIN_PASSWORD="zouma-simulation-local"
WEB_PID=""
ADMIN_PID=""

log() { printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
die() { printf '\n启动失败：%s\n' "$*" >&2; exit 1; }
generate_secret() { openssl rand -hex 32; }
port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1; }
web_is_ready() { curl -fsS http://127.0.0.1:3000/api/v1/system/health 2>/dev/null | grep -q '"status":"ok"'; }
admin_is_ready() { curl -fsS http://127.0.0.1:3001/login 2>/dev/null | grep -q '管理员登录'; }
listener_addresses() {
  lsof -nP -a -iTCP:"$1" -sTCP:LISTEN -F n 2>/dev/null | sed -n 's/^n//p'
}
listener_is_local() {
  addresses="$(listener_addresses "$1")"
  [ -n "$addresses" ] || return 1
  for address in $addresses; do
    case "$address" in
      127.0.0.1:*|\[::1\]:*) ;;
      *) return 1 ;;
    esac
  done
}

classify_existing_services() {
  if ! port_in_use 3000 && ! port_in_use 3001; then printf start; return; fi
  if port_in_use 3000 && port_in_use 3001 && web_is_ready && admin_is_ready; then printf reuse; return; fi
  printf conflict
}

list_owned_descendants() {
  local parent_pid child_pids child_pid
  parent_pid="$1"
  child_pids="$(pgrep -P "$parent_pid" 2>/dev/null || true)"
  for child_pid in $child_pids; do
    list_owned_descendants "$child_pid"
    printf '%s\n' "$child_pid"
  done
}
kill_owned_pid() {
  local root_pid owned_pids late_owned_pids owned_pid
  root_pid="$1"
  [ -n "$root_pid" ] || return 0
  owned_pids="$(list_owned_descendants "$root_pid"; printf '%s\n' "$root_pid")"
  for owned_pid in $owned_pids; do
    kill -TERM "$owned_pid" >/dev/null 2>&1 || true
  done
  sleep "${SHUTDOWN_GRACE_SECONDS:-1}"
  late_owned_pids="$(list_owned_descendants "$root_pid")"
  owned_pids="$late_owned_pids $owned_pids"
  for owned_pid in $owned_pids; do
    kill -0 "$owned_pid" >/dev/null 2>&1 || continue
    kill -KILL "$owned_pid" >/dev/null 2>&1 || true
  done
  wait "$root_pid" >/dev/null 2>&1 || true
}
cleanup() {
  kill_owned_pid "$WEB_PID"
  kill_owned_pid "$ADMIN_PID"
  WEB_PID=""
  ADMIN_PID=""
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

require_command() { command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"; }
wait_for_postgres() {
  attempt=0
  while [ "$attempt" -lt 60 ]; do
    docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U zouma -d zouma >/dev/null 2>&1 && return 0
    attempt=$((attempt + 1)); sleep 1
  done
  return 1
}
wait_for_http() {
  url="$1"; pattern="$2"; attempt=0
  while [ "$attempt" -lt 90 ]; do
    curl -fsS "$url" 2>/dev/null | grep -q "$pattern" && return 0
    attempt=$((attempt + 1)); sleep 1
  done
  return 1
}

simulation_prisma_is_ready() {
  response="$(
    printf 'silent\nshow-error\nfail\nurl = "http://127.0.0.1:3000/api/v1/simulations/runs?page=1&pageSize=1"\nheader = "x-admin-token: %s"\n' "$ADMIN_API_TOKEN" |
      curl --config -
  )" || return 1
  printf '%s' "$response" | node -e '
    const fs = require("node:fs")
    try {
      const body = JSON.parse(fs.readFileSync(0, "utf8"))
      if (body?.meta?.backend !== "prisma" || body?.meta?.degraded !== false)
        process.exit(1)
    } catch {
      process.exit(1)
    }
  '
}

start_services() {
  pnpm --filter @zouma/web exec next dev --hostname 127.0.0.1 --port 3000 >"$LOG_DIR/web.log" 2>&1 & WEB_PID=$!
  pnpm --filter @zouma/admin exec next dev --hostname 127.0.0.1 --port 3001 >"$LOG_DIR/admin.log" 2>&1 & ADMIN_PID=$!
}

process_is_alive() {
  [ -n "$1" ] && kill -0 "$1" >/dev/null 2>&1
}
supervise_services() {
  while process_is_alive "$WEB_PID" && process_is_alive "$ADMIN_PID"; do
    sleep "${SUPERVISOR_POLL_SECONDS:-0.5}"
  done

  exited_pid="$WEB_PID"
  exited_service="Web"
  exited_log="$LOG_DIR/web.log"
  if process_is_alive "$WEB_PID"; then
    exited_pid="$ADMIN_PID"
    exited_service="Admin"
    exited_log="$LOG_DIR/admin.log"
  fi
  if wait "$exited_pid"; then
    service_status=0
  else
    service_status=$?
  fi
  cleanup
  printf '\n%s 服务已退出（状态 %s），查看 %s\n' "$exited_service" "$service_status" "$exited_log" >&2
  [ "$service_status" -ne 0 ] || service_status=1
  return "$service_status"
}

main() {
  cd "$PROJECT_ROOT"
  require_command docker; require_command pnpm; require_command node; require_command curl
  require_command lsof; require_command pgrep; require_command openssl; require_command open

  state="$(classify_existing_services)"
  [ "$state" != conflict ] || die "3000 或 3001 已被其他程序占用"
  if [ "$state" = reuse ]; then
    die "规则模拟工作台已在运行；请使用原窗口，或先在原窗口按 Ctrl+C 停止后重试"
  fi

  docker info >/dev/null 2>&1 || die "请先启动 Docker Desktop"
  mkdir -p "$LOG_DIR"
  docker compose -f "$COMPOSE_FILE" up -d postgres
  wait_for_postgres || die "PostgreSQL 未在 60 秒内就绪"

  [ -d node_modules/.pnpm ] || pnpm install --frozen-lockfile
  export DATABASE_URL
  pnpm --filter @zouma/database exec prisma generate --schema prisma/schema.prisma
  pnpm --filter @zouma/database exec prisma migrate deploy --schema prisma/schema.prisma

  ADMIN_API_TOKEN="$(generate_secret)" || die "Admin API token 生成失败"
  [ -n "$ADMIN_API_TOKEN" ] || die "Admin API token 为空"
  ADMIN_SESSION_SECRET="$(generate_secret)" || die "Admin session secret 生成失败"
  [ -n "$ADMIN_SESSION_SECRET" ] || die "Admin session secret 为空"
  export ADMIN_API_TOKEN ADMIN_SESSION_SECRET
  export ADMIN_LOGIN_PASSWORD WEB_API_BASE="http://127.0.0.1:3000/api/v1"
  export CORS_ALLOWED_ORIGINS="http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:3000,http://localhost:3001"
  export SIMULATION_REPOSITORY_MODE="prisma"

  start_services
  wait_for_http http://127.0.0.1:3000/api/v1/system/health '"status":"ok"' || die "Web API 启动失败，查看 $LOG_DIR/web.log"
  wait_for_http http://127.0.0.1:3001/login '管理员登录' || die "Admin 启动失败，查看 $LOG_DIR/admin.log"
  listener_is_local 3000 || die "Web 未仅监听 127.0.0.1:3000"
  listener_is_local 3001 || die "Admin 未仅监听 127.0.0.1:3001"
  simulation_prisma_is_ready || die "模拟仓库未使用 Prisma，查看 $LOG_DIR/web.log"

  printf '\n规则模拟工作台已启动\n地址：http://127.0.0.1:3001/simulations\n登录口令：%s\n按 Ctrl+C 停止 Web/Admin。\n' "$ADMIN_LOGIN_PASSWORD"
  open http://127.0.0.1:3001/login
  supervise_services
}

if [ "${SIMULATION_LAUNCHER_SOURCE_ONLY:-0}" != 1 ]; then main "$@"; fi
