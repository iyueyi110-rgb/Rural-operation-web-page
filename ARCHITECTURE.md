# 技术架构

## 系统上下文

本仓库是 pnpm/Turborepo Monorepo，包含两个 Next.js 应用和七个共享包。项目没有独立 API 服务；服务端工作流由 Next.js Route Handlers 和共享服务端模块承载。

```text
浏览器
  ├─ apps/web   ── 游客、认养用户、村民体验与 /api/v1
  └─ apps/admin ── 运营端与经过身份验证的后台代理
                         │
                         ▼
  contracts · database · knowledge · prompts · simulation · ui · utils
                         │
                         ▼
            PostgreSQL / Redis / 模型服务商
```

## 应用

### 用户端与服务端：`apps/web`

- 提供 `zh-CN`、`en`、`ja` 三种语言的公开页面。
- 覆盖认养、履约、互动、预约、路线、改造、隐私和村民协作流程。
- `/api/v1` Route Handlers 是仓库的 HTTP 边界。
- PostgreSQL 不可用时，公开页面使用经过审阅的演示降级数据保持可构建和可展示。

### 运营端：`apps/admin`

- 提供资产、任务、村民、规则模拟、AI 辅助、预警、报告和改造管理界面。
- 浏览器会话使用 HttpOnly 签名 Cookie；服务端之间的后台令牌不会发送给浏览器。
- 后台 BFF 代理经过授权的 Web API 请求，并规范化上游响应。

## 共享包

| 包 | 职责 |
| --- | --- |
| `@zouma/contracts` | 跨应用 TypeScript DTO 与领域联合类型 |
| `@zouma/database` | Prisma 客户端、Schema、迁移、种子数据和 Redis 访问 |
| `@zouma/knowledge` | 本地 BM25 检索、角色过滤、PII 清洗和引用校验 |
| `@zouma/prompts` | 版本化提示词模板和经过审阅的降级回答 |
| `@zouma/simulation` | 确定性 V0/V1 履约规则评测 |
| `@zouma/ui` | 小型 React/Next.js 共享组件层 |
| `@zouma/utils` | 模型适配、评分、控制、改造和超时工具 |

依赖方向从应用指向共享包；共享包不得导入应用代码。

## 数据流

### 认养履约

1. 用户通过 Web 应用选择并认养树木。
2. Route Handler 校验请求，并通过 Prisma 持久化领域记录。
3. 履约任务依次经历接单、执行、提交、审核和结算。
4. 时间线、通知、权益、采收预约和运营报告读取同一组记录。

### 知识查询

1. API 验证运营人员或村民身份，并应用速率限制。
2. 问题经过长度校验、隐私清洗和角色过滤。
3. 本地 BM25 检索选择当前角色允许访问的知识片段。
4. 回答器校验文档元数据和逐字引用；证据不足或不安全时返回受控拒答。

### 规则模拟

1. 固定种子和场景生成不可变世界。
2. V0、V1 在同一世界运行并保持相同 `worldHash`。
3. 13 项指标和可追踪 Bad Case 与显式升级门槛比较。
4. 11 类导出物保留来源信息和模拟免责声明。

模拟记录与真实用户、支付、订单和生产报告完全隔离。

## 可靠性与安全

- 数据库不可用时，公开页面使用经过审阅的演示降级；高权限写操作不会伪装成功。
- 模型调用统一使用共享服务商适配器和固定降级，不允许浏览器直接访问模型。
- 精确坐标、手机号、支付标识和用户身份不得进入外部模型提示词。
- 后台登录、村民 OTP、上传校验、API 身份验证和速率限制均保留在服务端。
- 密钥只存在于本地或部署环境，不进入 Git。

实施约束见 [Codex 执行规则](.codex/execution-rules.md)，数据模型见[数据结构](docs/tech/database-schema.md)。
