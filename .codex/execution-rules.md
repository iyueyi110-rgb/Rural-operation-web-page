# Codex 执行规则

本文档补充根目录 [`AGENTS.md`](../AGENTS.md) 的项目约束，适用于整个仓库。

## 一、当前架构

- 仓库采用 pnpm workspace 与 Turborepo。
- `apps/web` 是面向游客、认养用户和村民的 Next.js 14 应用，也承载 `/api/v1` Route Handlers。
- `apps/admin` 是运营后台，通过同源 BFF 访问服务端能力。
- `packages/database` 管理 Prisma、PostgreSQL 与 Redis；其余共享包包括 `contracts`、`knowledge`、`prompts`、`simulation`、`ui` 和 `utils`。
- Web 使用 `next-intl` 管理 `zh-CN`、`en`、`ja` 运行时界面资源；文档中文化不得删除这些资源。
- 使用 Node.js 20+ 与 `pnpm@11.6.0`。

## 二、修改边界

- 只修改任务直接涉及的内容，不顺带重写无关模块。
- 不提交 `.env.local`、`output/`、`outputs/`、缓存、本地数据库、日志或用户未跟踪文件。
- 未经明确要求，不修改 Prisma schema/迁移、HTTP 合约、包级导出或业务状态机。
- 模拟材料必须标注“模拟运营数据，不代表真实业务结果”，不得描述为真实业务收益。
- 不接入真实支付，不执行生产部署；只有任务明确授权时才修改 GitHub 远端设置。

## 三、TypeScript 与 Next.js

- 保持 TypeScript strict，并通过现有 workspace 边界导入共享能力。
- 默认使用 Server Components；只有确需浏览器状态或交互时才使用 Client Components。
- Route Handler 沿用现有错误与分页结构，不暴露内部异常、密钥或堆栈。
- Web 界面文案修改应同步 `zh-CN`、`en`、`ja` 三种 locale。
- 不绕过管理员会话、村民 OTP、速率限制、上传校验和角色过滤。

## 四、数据、隐私与模型调用

- 禁止向外部模型发送手机号、身份证号、真实姓名、支付标识、精确坐标或订单明细。
- 模型调用复用 `packages/utils` 的 provider adapter 与既有降级逻辑。
- Prisma 迁移只追加，不修改已发布迁移。
- `.env.example` 只放变量名和安全占位值，真实凭证仅存于本地环境或部署平台。

## 五、模拟系统

- V0/V1 成对运行必须共享 seed、scenario、config 与 `worldHash`。
- 固定回归矩阵为 5 个种子 × 8 个场景，共 40 组。
- 未经明确要求，不改变指标定义、推荐门槛或确定性算法。
- 运行产物写入 `outputs/simulation/` 并保持 Git 忽略；只提交复核后的结论文档。

## 六、Git 与文档

- 分支使用 `codex/` 前缀，提交遵循 Conventional Commits，类型和 scope 保留标准英文，主题使用中文。
- PR 标题、说明、验收记录和说明性 Markdown 标题及正文使用中文；代码、命令、路径、API、JSON 字段、包名和必要技术标识保持原样。
- 大规模移动使用 `git mv`，纯移动提交与内容修改提交分开。
- 仓库事实以当前代码、测试和最新报告为准；历史计划只作为背景。
- 文档相对链接和中文化约束必须通过 `pnpm docs:check`。

## 七、质量门

常规修改完成后运行：

```bash
pnpm type-check
pnpm test
pnpm docs:check
pnpm build
git diff --check
```

模拟系统变更还需运行：

```bash
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
pnpm simulation:regression
```

项目规则索引见 [`.codex/README.md`](README.md)。
