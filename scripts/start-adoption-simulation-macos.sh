#!/bin/bash
set -Eeuo pipefail

PROJECT_ROOT="/Users/limyoon/Desktop/aigc"
COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.dev.yml"
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

classify_existing_services() {
  if ! port_in_use 3000 && ! port_in_use 3001; then printf start; return; fi
  if port_in_use 3000 && port_in_use 3001 && web_is_ready && admin_is_ready; then printf reuse; return; fi
  printf conflict
}

kill_owned_pid() { [ -n "$1" ] && kill "$1" >/dev/null 2>&1 || true; }
cleanup() { kill_owned_pid "$WEB_PID"; kill_owned_pid "$ADMIN_PID"; }
trap cleanup EXIT INT TERM

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

main() {
  cd "$PROJECT_ROOT"
  require_command docker; require_command pnpm; require_command curl
  require_command lsof; require_command openssl; require_command open

  state="$(classify_existing_services)"
  [ "$state" != conflict ] || die "3000 或 3001 已被其他程序占用"
  if [ "$state" = reuse ]; then
    printf '\n检测到规则模拟工作台已运行。\n地址：http://127.0.0.1:3001/simulations\n本地登录口令：%s\n' "$ADMIN_LOGIN_PASSWORD"
    open http://127.0.0.1:3001/login
    return 0
  fi

  docker info >/dev/null 2>&1 || die "请先启动 Docker Desktop"
  mkdir -p "$LOG_DIR"
  docker compose -f "$COMPOSE_FILE" up -d postgres
  wait_for_postgres || die "PostgreSQL 未在 60 秒内就绪"

  [ -d node_modules/.pnpm ] || pnpm install --frozen-lockfile
  export DATABASE_URL
  pnpm --filter @zouma/database exec prisma generate --schema prisma/schema.prisma
  pnpm --filter @zouma/database exec prisma migrate deploy --schema prisma/schema.prisma

  export ADMIN_API_TOKEN="$(generate_secret)"
  export ADMIN_SESSION_SECRET="$(generate_secret)"
  export ADMIN_LOGIN_PASSWORD WEB_API_BASE="http://127.0.0.1:3000/api/v1"
  export CORS_ALLOWED_ORIGINS="http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:3000,http://localhost:3001"

  pnpm --filter @zouma/web dev >"$LOG_DIR/web.log" 2>&1 & WEB_PID=$!
  pnpm --filter @zouma/admin dev >"$LOG_DIR/admin.log" 2>&1 & ADMIN_PID=$!
  wait_for_http http://127.0.0.1:3000/api/v1/system/health '"status":"ok"' || die "Web API 启动失败，查看 $LOG_DIR/web.log"
  wait_for_http http://127.0.0.1:3001/login '管理员登录' || die "Admin 启动失败，查看 $LOG_DIR/admin.log"

  printf '\n规则模拟工作台已启动\n地址：http://127.0.0.1:3001/simulations\n登录口令：%s\n按 Ctrl+C 停止 Web/Admin。\n' "$ADMIN_LOGIN_PASSWORD"
  open http://127.0.0.1:3001/login
  wait "$WEB_PID" "$ADMIN_PID"
}

if [ "${SIMULATION_LAUNCHER_SOURCE_ONLY:-0}" != 1 ]; then main "$@"; fi
