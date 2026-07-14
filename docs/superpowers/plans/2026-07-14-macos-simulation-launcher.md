# macOS Simulation Workbench Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个可在 Finder 双击的一键启动器，只启动认养规则模拟工作台所需的 PostgreSQL、Web 模拟 API 和 Admin，并自动打开登录页。

**Architecture:** 仓库内的 Bash 脚本负责依赖检查、Docker PostgreSQL、Prisma 迁移、两个 Next.js 进程、就绪探测和进程清理；桌面 `.command` 只以绝对路径调用该脚本。脚本使用函数边界和命令注入点进行无副作用测试，真实验收再启动 Docker 与服务。

**Tech Stack:** macOS Bash 3.2、Docker Compose、PostgreSQL 16、pnpm 11、Prisma 6、Next.js 14、`curl`、`lsof`、`openssl`、macOS `open`

## Global Constraints

- 只启动 Compose 的 `postgres` 服务，不启动 Redis。
- Web API 使用端口 3000，Admin 使用端口 3001，只打开 `http://localhost:3001/login`。
- 数据库固定为 `postgresql://zouma:zouma_dev@127.0.0.1:5432/zouma`。
- 本地管理员口令固定为 `zouma-simulation-local`；API token 与 session secret 每次启动临时生成且不得写入文件或浏览器代码。
- Prisma 失败时必须停止，不能静默使用 JSON 降级。
- 只终止本次脚本创建的 Web/Admin 子进程，不误杀已有进程；PostgreSQL 容器在退出后保持运行。
- 启动日志只写入被 Git 忽略的 `tmp/simulation-launcher/`。
- 兼容 macOS 自带 Bash 3.2，不使用关联数组、`mapfile`、`wait -n` 或 GNU-only 参数。

---

### Task 1: 可测试的仓库启动脚本

**Files:**

- Create: `scripts/start-adoption-simulation-macos.sh`
- Create: `scripts/start-adoption-simulation-macos.test.sh`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: `infra/docker/docker-compose.dev.yml`、Web `/api/v1/system/health`、Admin `/login`、根目录 pnpm workspace。
- Produces: `main()` 启动入口；`classify_existing_services()` 返回 `start`、`reuse` 或 `conflict`；`cleanup()` 只清理 `WEB_PID` 和 `ADMIN_PID`。

- [ ] **Step 1: 写失败的 Shell 行为测试**

创建 `scripts/start-adoption-simulation-macos.test.sh`，source 生产脚本后覆盖探测函数，验证三种端口状态、secret 长度、清理边界与固定本机口令：

```bash
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
```

- [ ] **Step 2: 运行测试确认红灯**

Run:

```bash
bash scripts/start-adoption-simulation-macos.test.sh
```

Expected: FAIL，提示 `scripts/start-adoption-simulation-macos.sh` 不存在。

- [ ] **Step 3: 实现最小但完整的启动器**

创建 `scripts/start-adoption-simulation-macos.sh`，结构必须包含以下实际行为：

```bash
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
```

在 `.gitignore` 添加：

```gitignore
tmp/simulation-launcher/
```

- [ ] **Step 4: 运行单元检查并修正 Bash 3.2 兼容性**

Run:

```bash
bash -n scripts/start-adoption-simulation-macos.sh
bash -n scripts/start-adoption-simulation-macos.test.sh
bash scripts/start-adoption-simulation-macos.test.sh
```

Expected: 两个语法检查退出 0，行为测试输出 `launcher unit checks passed`。

- [ ] **Step 5: 提交仓库启动器**

```bash
git add .gitignore scripts/start-adoption-simulation-macos.sh scripts/start-adoption-simulation-macos.test.sh
git commit -m "feat(simulation): add macOS workbench launcher"
```

### Task 2: Finder 桌面快捷方式

**Files:**

- Create: `/Users/limyoon/Desktop/启动认养一棵树规则模拟.command`
- Test: `scripts/start-adoption-simulation-macos.test.sh`

**Interfaces:**

- Consumes: executable `scripts/start-adoption-simulation-macos.sh` from Task 1.
- Produces: Finder 可双击的桌面 `.command` 文件。

- [ ] **Step 1: 写桌面入口契约测试并确认红灯**

向 `scripts/start-adoption-simulation-macos.test.sh` 增加：

```bash
SHORTCUT="/Users/limyoon/Desktop/启动认养一棵树规则模拟.command"
[ -f "$SHORTCUT" ] || fail "desktop shortcut missing"
[ -x "$SHORTCUT" ] || fail "desktop shortcut is not executable"
grep -Fq 'scripts/start-adoption-simulation-macos.sh' "$SHORTCUT" || fail "shortcut target missing"
```

Run: `bash scripts/start-adoption-simulation-macos.test.sh`

Expected: FAIL with `desktop shortcut missing`。

- [ ] **Step 2: 创建最小桌面入口**

创建 `/Users/limyoon/Desktop/启动认养一棵树规则模拟.command`：

```bash
#!/bin/bash
exec "/Users/limyoon/Desktop/aigc/scripts/start-adoption-simulation-macos.sh"
```

设置权限：

```bash
chmod +x scripts/start-adoption-simulation-macos.sh \
  scripts/start-adoption-simulation-macos.test.sh \
  /Users/limyoon/Desktop/启动认养一棵树规则模拟.command
```

- [ ] **Step 3: 验证 Finder 入口契约**

Run:

```bash
bash scripts/start-adoption-simulation-macos.test.sh
file /Users/limyoon/Desktop/启动认养一棵树规则模拟.command
```

Expected: 测试通过，`file` 将入口识别为 Bourne-Again shell script。

- [ ] **Step 4: 提交桌面入口契约测试**

桌面文件位于仓库外不提交，只提交测试：

```bash
git add scripts/start-adoption-simulation-macos.test.sh
git commit -m "test(simulation): verify macOS desktop shortcut"
```

### Task 3: 真实一键启动验收

**Files:**

- Modify: `README.md`
- Verify: `scripts/start-adoption-simulation-macos.sh`
- Verify: `/Users/limyoon/Desktop/启动认养一棵树规则模拟.command`

**Interfaces:**

- Consumes: Task 1 启动器与 Task 2 Finder 入口。
- Produces: 可复现的本地启动说明与真实服务验收证据。

- [ ] **Step 1: 在 README 增加单一启动入口**

在“本地启动”前增加：

```markdown
## macOS 一键启动规则模拟工作台

双击桌面的 `启动认养一棵树规则模拟.command`。启动器只运行 PostgreSQL、Web 模拟 API 与 Admin，自动打开登录页；本地登录口令为 `zouma-simulation-local`。按 `Ctrl+C` 停止 Web/Admin，PostgreSQL 容器保持运行。
```

- [ ] **Step 2: 执行真实启动并验证数据库后端**

Run:

```bash
/Users/limyoon/Desktop/启动认养一棵树规则模拟.command
```

在另一终端验证：

```bash
docker compose -f infra/docker/docker-compose.dev.yml ps postgres
curl -fsS http://127.0.0.1:3000/api/v1/system/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/login
```

Expected: PostgreSQL 为 healthy/running；健康接口包含 `"status":"ok"`；登录页 HTTP 200。登录并创建一次小规模 V0/V1 后，列表响应 `meta.backend` 为 `prisma` 且 `meta.degraded` 为 `false`。

- [ ] **Step 3: 验证停止行为与容器保留**

在启动终端按 `Ctrl+C`，然后运行：

```bash
! lsof -nP -iTCP:3000 -sTCP:LISTEN -t
! lsof -nP -iTCP:3001 -sTCP:LISTEN -t
docker compose -f infra/docker/docker-compose.dev.yml exec -T postgres pg_isready -U zouma -d zouma
```

Expected: 3000/3001 无监听；`pg_isready` 返回 accepting connections。

- [ ] **Step 4: 运行最终静态和行为门禁**

```bash
bash -n scripts/start-adoption-simulation-macos.sh
bash scripts/start-adoption-simulation-macos.test.sh
rg -n 'ADMIN_API_TOKEN=|ADMIN_SESSION_SECRET=' scripts/start-adoption-simulation-macos.sh
git diff --check
```

Expected: 语法和行为测试通过；`rg` 只命中运行时生成语句，不出现固定 token/secret；diff check 通过。

- [ ] **Step 5: 提交文档并交付**

```bash
git add README.md
git commit -m "docs: add macOS simulation launcher instructions"
```

最终交付中报告桌面路径、登录口令、日志路径、停止方式、验证结果与 Docker Desktop 前置条件。
