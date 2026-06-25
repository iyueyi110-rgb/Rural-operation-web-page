#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

FRONTEND_URL="http://localhost:3000/zh-CN"
ADMIN_URL="http://localhost:3001/dashboard"

print_step() {
  echo
  echo "==> $1"
}

fail() {
  echo
  echo "启动失败：$1"
  echo "按任意键关闭窗口。"
  read -r -n 1
  exit 1
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    fail "未找到 Docker Compose，请安装或更新 Docker Desktop。"
  fi
}

port_in_use() {
  lsof -iTCP:"$1" -sTCP:LISTEN -Pn >/dev/null 2>&1
}

url_ready() {
  curl -fsS "$1" >/dev/null 2>&1
}

ensure_tools() {
  command -v docker >/dev/null 2>&1 || fail "未找到 Docker，请先安装 Docker Desktop。"

  if ! command -v pnpm >/dev/null 2>&1; then
    if command -v corepack >/dev/null 2>&1; then
      print_step "启用 pnpm"
      corepack enable
      corepack prepare pnpm@11.6.0 --activate
    else
      fail "未找到 pnpm。请先安装 Node.js 18+，或执行：npm install -g pnpm"
    fi
  fi
}

start_docker_desktop() {
  print_step "启动 Docker Desktop"
  open -a Docker || true
}

wait_for_docker() {
  local attempts=90
  until docker info >/dev/null 2>&1; do
    attempts=$((attempts - 1))
    if [ "$attempts" -le 0 ]; then
      fail "Docker Desktop 启动超时，请确认 Docker 已正常运行后再双击启动端。"
    fi
    sleep 2
  done
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts=90

  print_step "等待 ${label} 就绪"
  until url_ready "$url"; do
    attempts=$((attempts - 1))
    if [ "$attempts" -le 0 ]; then
      fail "${label} 没有按时启动，请查看当前窗口里的错误信息。"
    fi
    sleep 2
  done
}

open_sites() {
  print_step "打开系统页面"
  open "$FRONTEND_URL" >/dev/null 2>&1 || true
  open "$ADMIN_URL" >/dev/null 2>&1 || true
  echo "前台：$FRONTEND_URL"
  echo "后台：$ADMIN_URL"
}

cleanup() {
  if [ -n "${DEV_PID:-}" ]; then
    echo
    echo "正在关闭前后台开发服务..."
    kill "$DEV_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup INT TERM

echo "走马村 AIGC 系统 Mac 启动端"
echo "项目目录：$ROOT_DIR"

ensure_tools

if url_ready "$FRONTEND_URL" && url_ready "$ADMIN_URL"; then
  echo
  echo "系统已经在运行，直接打开浏览器。"
  open_sites
  exit 0
fi

if port_in_use 3000 || port_in_use 3001; then
  fail "端口 3000 或 3001 已被占用。请先关闭旧的服务窗口，再重新双击启动端。"
fi

if ! docker info >/dev/null 2>&1; then
  start_docker_desktop
  wait_for_docker
fi

print_step "启动 PostgreSQL 数据库"
compose_cmd -f infra/docker/docker-compose.dev.yml up -d

print_step "等待数据库就绪"
sleep 3

if [ ! -d "node_modules" ]; then
  print_step "首次安装项目依赖"
  pnpm install
fi

print_step "同步数据库结构和种子数据"
(
  cd packages/database
  npx prisma db push
  npx prisma db seed
)

print_step "启动前台和后台"
pnpm turbo dev --filter=@zouma/web --filter=@zouma/admin &
DEV_PID=$!

wait_for_url "$FRONTEND_URL" "前台"
wait_for_url "$ADMIN_URL" "后台"
open_sites

echo
echo "启动完成。使用期间请保持这个窗口打开；按 Control+C 可关闭服务。"
wait "$DEV_PID"
