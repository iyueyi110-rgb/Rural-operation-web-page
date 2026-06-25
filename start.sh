#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  走马村「云脉寿岭·荔水走马」一键启动脚本
#  启动顺序：Docker → PostgreSQL → Prisma → Web(3000) + Admin(3001)
# ============================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ---- 配置 ----
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3001}"
DB_COMPOSE_FILE="infra/docker/docker-compose.dev.yml"
SKIP_DB="${SKIP_DB:-0}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_BROWSER="${SKIP_BROWSER:-0}"

# ---- 颜色 ----
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERR]${NC}   $*" >&2; }
step()  { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

url_ready() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$url" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget -q --spider "$url" >/dev/null 2>&1
  else
    return 1
  fi
}

open_sites() {
  if [ "$SKIP_BROWSER" = "1" ]; then return 0; fi

  case "${OSTYPE:-}" in
    darwin*)
      open "$FRONTEND_URL" >/dev/null 2>&1 || true
      open "$ADMIN_URL" >/dev/null 2>&1 || true
      ;;
    msys*|cygwin*|win32*)
      cmd.exe /c start "" "$FRONTEND_URL" >/dev/null 2>&1 || true
      cmd.exe /c start "" "$ADMIN_URL" >/dev/null 2>&1 || true
      ;;
  esac
}

# ---- 清理 ----
cleanup() {
  echo
  info "正在停止开发服务器..."
  if [ -n "${DEV_PID:-}" ]; then kill "$DEV_PID" 2>/dev/null || true; fi
  if [ "${SKIP_DB}" != "1" ]; then
    info "数据库容器保持运行。手动停止：docker compose -f $DB_COMPOSE_FILE down"
  fi
  ok "已退出。"
}
trap cleanup INT TERM

# ============================================================
#  Step 0：环境检查
# ============================================================
step "0/6 环境检查"

# Node.js
if ! command -v node >/dev/null 2>&1; then
  err "未找到 Node.js，请先安装：https://nodejs.org"
  exit 1
fi
ok "Node.js $(node -v)"

# pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  warn "未找到 pnpm，尝试通过 corepack 启用..."
  if command -v corepack >/dev/null 2>&1; then
    corepack enable && corepack prepare pnpm@11.6.0 --activate
  else
    err "请先安装 pnpm：npm install -g pnpm@11"
    exit 1
  fi
fi
ok "pnpm $(pnpm -v)"

# Docker（仅当需要数据库时）
if [ "$SKIP_DB" != "1" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    err "未找到 Docker，请安装 Docker Desktop。或使用 SKIP_DB=1 跳过数据库启动。"
    exit 1
  fi
  ok "Docker $(docker --version | cut -d' ' -f3 | sed 's/,//')"
fi

# 环境变量文件
if [ ! -f ".env.local" ]; then
  warn ".env.local 不存在，使用 .env.example 作为默认配置"
  warn "DEEPSEEK_API_KEY 和 QWEATHER_API_KEY 未配置将导致 AI 和天气功能不可用"
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    info "已从 .env.example 创建 .env.local，请编辑填入实际 API Key"
  fi
fi

if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
  ok "环境变量已加载"
fi

# 端口检查
port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$1" -sTCP:LISTEN -Pn >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -ltn | grep -E "[:.]${1}[[:space:]]" >/dev/null 2>&1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -an | grep -E "[:.]${1}[[:space:]].*(LISTEN|LISTENING)" >/dev/null 2>&1
  else
    return 1
  fi
}

if url_ready "$FRONTEND_URL" && url_ready "$ADMIN_URL"; then
  ok "系统已经在运行，直接打开页面。"
  open_sites
  exit 0
fi

for port in 3000 3001; do
  if port_in_use "$port"; then
    err "端口 ${port} 已被占用。请先停止占用进程，或修改 FRONTEND_URL/ADMIN_URL 环境变量。"
    exit 1
  fi
done
ok "端口 3000/3001 可用"

# ============================================================
#  Step 1：安装依赖
# ============================================================
step "1/6 安装依赖"

if [ "$SKIP_INSTALL" != "1" ]; then
  if [ ! -d "node_modules" ]; then
    info "首次运行，安装所有依赖..."
    pnpm install
  else
    info "依赖已存在，跳过安装。使用 SKIP_INSTALL=0 强制重装。"
  fi
else
  info "跳过依赖安装（SKIP_INSTALL=1）"
fi
ok "依赖就绪"

# ============================================================
#  Step 2：Prisma Client 生成
# ============================================================
step "2/6 生成 Prisma Client"

cd "$ROOT_DIR/packages/database"
npx prisma generate
cd "$ROOT_DIR"
ok "Prisma Client 已生成"

# ============================================================
#  Step 3：启动 PostgreSQL
# ============================================================
step "3/6 启动数据库"

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    err "Docker Compose 不可用"
    exit 1
  fi
}

if [ "$SKIP_DB" != "1" ]; then
  # 确保 Docker 运行
  if ! docker info >/dev/null 2>&1; then
    info "Docker 未运行，尝试启动..."
    case "${OSTYPE:-}" in
      darwin*) open -a Docker || true ;;
      msys*|cygwin*|win32*) powershell.exe -NoProfile -Command "Start-Process 'Docker Desktop'" >/dev/null 2>&1 || true ;;
      *) err "请手动启动 Docker 后重试"; exit 1 ;;
    esac
    info "等待 Docker 就绪..."
    for i in $(seq 1 60); do
      if docker info >/dev/null 2>&1; then break; fi
      sleep 2
    done
    if ! docker info >/dev/null 2>&1; then
      err "Docker 启动超时"; exit 1
    fi
  fi

  # 启动 PostgreSQL 容器
  if compose_cmd -f "$DB_COMPOSE_FILE" ps | grep -q "running"; then
    info "PostgreSQL 容器已在运行"
  else
    info "启动 PostgreSQL..."
    compose_cmd -f "$DB_COMPOSE_FILE" up -d
  fi

  # 等待 PostgreSQL 真正就绪
  info "等待 PostgreSQL 就绪..."
  db_ready=0
  for i in $(seq 1 30); do
    if compose_cmd -f "$DB_COMPOSE_FILE" exec -T postgres pg_isready -U zouma >/dev/null 2>&1; then
      db_ready=1
      break
    fi
    sleep 1
  done
  if [ "$db_ready" -ne 1 ]; then
    err "PostgreSQL 就绪检查超时"
    exit 1
  fi
  ok "PostgreSQL 已就绪"
else
  info "跳过数据库启动（SKIP_DB=1）"
fi

# ============================================================
#  Step 4：数据库迁移与种子
# ============================================================
step "4/6 数据库迁移与种子"

if [ "$SKIP_DB" != "1" ]; then
  cd "$ROOT_DIR/packages/database"

  if ! npx prisma db push --accept-data-loss; then
    err "数据库结构同步失败"
    exit 1
  fi
  info "已同步数据库结构"

  # 种子数据
  info "写入种子数据..."
  npx prisma db seed || warn "种子失败（可能已有数据）"
  cd "$ROOT_DIR"
  ok "数据库就绪"
else
  info "跳过数据库操作（SKIP_DB=1）"
fi

# ============================================================
#  Step 5：启动开发服务器
# ============================================================
step "5/6 启动开发服务器"

echo "  前台　　${FRONTEND_URL}"
echo "  后台　　${ADMIN_URL}"
echo

pnpm turbo dev --filter=@zouma/web --filter=@zouma/admin &
DEV_PID=$!

# ============================================================
#  Step 6：等待就绪
# ============================================================
step "6/6 等待服务就绪"

wait_for_url() {
  local url="$1" label="$2" attempts=60
  while [ "$attempts" -gt 0 ]; do
    if url_ready "$url"; then
      return 0
    elif ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
      warn "未找到 curl/wget，跳过 ${label} HTTP 就绪检查"
      return 0
    else
      sleep 2
    fi
    attempts=$((attempts - 1))
  done
  warn "${label} 启动超时，请检查终端输出"
  return 1
}

wait_for_url "$FRONTEND_URL" "前台"
wait_for_url "$ADMIN_URL" "后台"

echo
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok "  走马村云脑系统已启动"
ok "  前台　　${FRONTEND_URL}"
ok "  后台　　${ADMIN_URL}"
ok "  按 Ctrl+C 停止所有服务"
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================================
#  打开浏览器
# ============================================================
open_sites

wait "$DEV_PID"
