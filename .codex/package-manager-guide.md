# pnpm 与 Turborepo 指南

仓库固定使用 `pnpm@11.6.0`。不要混用 npm/yarn 生成其他锁文件。

## 常用命令

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm type-check
pnpm test
pnpm docs:check
pnpm quality:gate
```

运行单个 workspace：

```bash
pnpm --filter @zouma/simulation test
pnpm --filter @zouma/web dev
pnpm --filter @zouma/database db:generate
```

添加依赖：

```bash
pnpm --filter @zouma/web add <package>
pnpm --filter @zouma/web add -D <package>
pnpm add -Dw <package>
```

## Workspace 规则

- 内部依赖使用 `workspace:*`。
- 只在实际使用依赖的 package 声明它；共享开发工具才放根目录。
- 修改 manifest 后提交 `pnpm-lock.yaml`。
- Turborepo 任务在 `turbo.json` 声明，持久开发任务关闭缓存，构建任务声明输出。

## 故障排查

- Prisma 类型缺失：`pnpm --filter @zouma/database db:generate`。
- 缓存怀疑失效：先运行带 `--force` 的对应 turbo 任务；不要删除用户目录。
- frozen install 失败：检查 manifest 与锁文件是否同步，不手工编辑 lockfile。
- 模拟输出位置异常：从根命令调用，或在包 CLI 中显式传 `--cwd`。
