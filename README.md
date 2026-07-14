# 走马村系统

本仓库是 Next.js + Prisma 单体仓库，包含用户端、管理端及共享领域包。认养履约规则模拟是独立的 `simulation` 数据域；它只用于 Demo 和规则验证，不写入真实订单、任务、支付或运营报表。

> 模拟运营数据，不代表真实业务结果。

## macOS 一键启动规则模拟工作台

双击桌面的 `启动认养一棵树规则模拟.command`。启动器只运行 PostgreSQL、Web 模拟 API 与 Admin，自动打开登录页；本地登录口令为 `zouma-simulation-local`。按 `Ctrl+C` 停止 Web/Admin，PostgreSQL 容器保持运行。

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
