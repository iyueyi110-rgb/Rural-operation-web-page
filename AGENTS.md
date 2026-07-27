# 仓库执行说明

## 适用范围

本说明适用于整个仓库。

## 工作规则

- 使用 Node.js 20+ 和 `pnpm@11.6.0`；本项目是 pnpm/Turborepo Monorepo。
- `apps/web` 和 `apps/admin` 是 Next.js 14 应用。服务端 API 使用 Next.js Route Handlers，不要假设存在独立 NestJS 服务。
- 保留用户和生成状态。不要提交 `.env.local`、`output/`、缓存、本地数据库或被忽略的模拟产物。
- 模拟结论必须明确标注“模拟运营数据，不代表真实业务结果”。
- 除非任务明确要求，否则不修改 Prisma Schema/迁移、HTTP 合约或包级导出。
- 已跟踪文件移动使用 `git mv`，纯移动提交与内容修改提交分开。
- 分支使用 `codex/` 前缀。
- 提交遵循 Conventional Commits：类型和作用域保留英文，主题使用中文。
- Markdown 正文、标题、PR 标题和 PR 说明使用中文；代码、命令、路径、API 和必要技术标识可保留英文。

## 必需检查

运行与改动相关的检查，并在交付前运行完整门禁：

```bash
pnpm type-check
pnpm test
pnpm docs:check
pnpm build
git diff --check
```

模拟改动还需运行：

```bash
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
```

## 参考

完整工程、隐私、模拟、Git 和文档规则见 `.codex/execution-rules.md`；项目专用索引见 `.codex/README.md`。
