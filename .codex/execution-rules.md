# Codex 执行规则

本文件是“认养一棵树：面向乡村文旅的认养履约与权益管理系统”的详细工程规则。根目录 `AGENTS.md` 是自动读取入口，本文件提供完整约束。

## 1. 当前架构

- Monorepo：pnpm workspace + Turborepo。
- 应用：`apps/web` 为游客、认养用户和村民使用的 Next.js 14 应用；`apps/admin` 为运营后台。
- 服务端：当前 API 由 Next.js Route Handlers/BFF 承载，不存在独立 NestJS 服务。
- 数据：`packages/database` 管理 Prisma schema、迁移和 PostgreSQL/Redis 访问。
- 共享包：`contracts`、`knowledge`、`prompts`、`simulation`、`ui`、`utils`。
- 国际化：Web 使用 `next-intl`，支持 `zh-CN`、`en`、`ja`；后台当前以中文运营界面为主。
- Node.js：20 或更高版本；包管理器固定为 `pnpm@11.6.0`。

## 2. 修改边界

- 优先做与任务直接相关的最小改动，不顺手重写无关模块。
- 不修改或提交 `.env.local`、`output/`、本地数据库、缓存、模拟运行产物和用户未跟踪文件。
- 数据库 schema 或迁移、HTTP 合约和包级公开导出发生变化时，必须同步测试和文档。
- 模拟数据必须标注“模拟运营数据，不代表真实业务结果”，不得描述为真实用户、村民效率或收益提升。
- 不接入真实支付、不执行生产部署、不修改 GitHub Settings，除非任务明确授权。

## 3. TypeScript 与 Next.js

- 保持 TypeScript strict，通过现有 workspace 类型边界导入共享能力。
- Server Components 为默认；仅在确需浏览器状态或交互时使用 Client Components。
- Route Handler 统一返回项目已有的错误和分页结构，不暴露内部异常、密钥或堆栈。
- 用户可见文案应进入现有消息文件或集中 copy 模块；修改 Web 文案时同步三种 locale。
- 图片优先使用 `next/image` 或项目的安全图片组件；外部链接增加安全属性。
- 不绕过现有管理员会话、村民 OTP、速率限制、上传校验和角色过滤。

## 4. 数据、隐私与模型调用

- 禁止把手机号、身份证号、真实姓名、支付标识、精确坐标或订单明细发送给外部模型。
- 模型调用复用 `packages/utils` 中的 provider adapter 和已有降级逻辑，不在页面或 Route Handler 中直接拼接第三方模型请求。
- Prisma 迁移只能追加，不修改已发布迁移；生产构建必须允许数据库不可用时使用现有公开降级数据。
- `.env.example` 只放变量名和安全占位值；真实凭证只存在于本地环境或部署平台。

## 5. 模拟系统

- V0/V1 成对运行必须共享 seed、scenario、config 和 worldHash。
- 固定回归矩阵为 5 个种子 × 8 个场景，共 40 组。
- 不改变指标定义、推荐门槛或确定性算法，除非任务明确要求且同时更新测试与方法论文档。
- 运行产物写入根 `outputs/simulation/` 并保持 Git 忽略；只提交经过复核的结论文档。

## 6. Git 与文档

- 分支使用 `codex/` 前缀，提交遵循 Conventional Commits。
- 大规模移动使用 `git mv`，移动提交与内容修改提交分离。
- 仓库事实以代码、测试和最新报告为准；旧计划只作为历史背景，不能覆盖实际实现。
- 文档相对链接必须通过 `pnpm docs:check`，核心行为变化需同步中英文 README 和对应 package README。

## 7. 质量门禁

常规改动完成后运行：

```bash
pnpm type-check
pnpm test
pnpm docs:check
pnpm build
git diff --check
```

模拟系统改动额外运行：

```bash
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
pnpm simulation:regression
```

完整规则索引见 `.codex/README.md`。
