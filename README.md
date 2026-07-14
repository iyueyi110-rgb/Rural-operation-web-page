# 走马村系统

本仓库是 Next.js + Prisma 单体仓库，包含用户端、管理端及共享领域包。认养履约规则模拟是独立的 `simulation` 数据域；它只用于 Demo 和规则验证，不写入真实订单、任务、支付或运营报表。

> 模拟运营数据，不代表真实业务结果。

## macOS 一键启动规则模拟工作台

先启动 Docker Desktop，再双击桌面的 `启动认养一棵树规则模拟.command`。启动器只运行 PostgreSQL、Web 模拟 API 与 Admin，不会启动 Redis；三个端口分别只监听 `127.0.0.1:5432`、`127.0.0.1:3000` 和 `127.0.0.1:3001`。验证数据库迁移和模拟只读接口确实使用 Prisma 后，启动器才会自动打开登录页；本地登录口令为 `zouma-simulation-local`。

一键启动专门设置 `SIMULATION_REPOSITORY_MODE=prisma`，Prisma 探测或查询失败时直接停止，**不适用**下面普通本地开发的 JSON/内存降级策略。Web 与 Admin 日志分别位于 `tmp/simulation-launcher/web.log` 和 `tmp/simulation-launcher/admin.log`；临时 Admin API token 只通过进程环境和 curl 标准输入传递，不写入日志或文件。

保持启动器终端打开。按 `Ctrl+C`，或终端收到 `TERM`/`HUP`，会停止本次启动拥有的 Web/Admin 完整子进程树；任一服务异常退出时也会停止另一个服务。启动器不会终止既有端口进程或 PostgreSQL，PostgreSQL 容器保持运行。

故障排查：提示 Docker 不可用时先确认 Docker Desktop 已完成启动；提示端口冲突或工作台已运行时，回到原启动终端使用现有实例，或先按 `Ctrl+C` 停止后重试；提示 PostgreSQL、Web、Admin 或 Prisma 未就绪时，先查看上述日志，再确认本机 5432/3000/3001 未被其他程序占用。启动器不会复用无法重新验证临时 token 和 Prisma backend 的旧进程。

## 本地启动

```bash
pnpm install --frozen-lockfile
export DATABASE_URL='postgresql://user:pass@localhost:5432/zouma'
pnpm --filter @zouma/database exec prisma generate --schema prisma/schema.prisma
pnpm dev
```

数据库不可用时，模拟 API 自动使用 `tmp/simulation-store/` JSON 仓库；文件系统不可写时继续降级到进程内存，并在响应 `meta.degraded` 中标记。管理接口沿用后台管理员鉴权配置。

## 规则模拟命令

```bash
# 单种子、单场景 V0/V1 成对运行
pnpm simulation:run --seed 20260713 --scenario NORMAL --output outputs/simulation/pair.json

# 5 个固定种子 × 8 个场景，共 40 组成对回归
pnpm simulation:regression --output outputs/simulation/regression-summary.json

# 比较两个已序列化运行；世界不一致时失败
pnpm simulation:compare --v0 run-v0.json --v1 run-v1.json --output comparison.json

# 生成 11 类导出物到 outputs/simulation/<comparisonId>/
pnpm simulation:export --seed 20260713 --scenario NORMAL
```

支持的场景为 `NORMAL`、`ADOPTION_PEAK`、`STAFF_SHORTAGE`、`CONTINUOUS_RAIN`、`LOW_SUBMISSION_QUALITY`、`REMOTE_ZONE_LOAD`、`REVIEW_BACKLOG`、`HARVEST_PEAK`。

## 验证

```bash
pnpm --filter @zouma/simulation test
pnpm --filter @zouma/web test
pnpm --filter @zouma/admin test
pnpm type-check
DATABASE_URL='postgresql://user:pass@localhost:5432/zouma' \
  pnpm --filter @zouma/database exec prisma validate --schema prisma/schema.prisma
pnpm build
```

设计与口径见 [模拟系统](docs/simulation-system.md)、[指标口径](docs/simulation-metrics.md)、[模拟方法](docs/simulation-methodology.md) 和 [交付说明](docs/adoption-simulation-delivery.md)。
