# 走马村前台系统 — 给 Codex 的执行规则

> 本文档定义 AI 编码助手（Codex / Claude）在走马村项目中的工程规范、开发约定和执行约束。每一条规则都是可被自动化验证的。

---

## 1. 项目信息

| 配置项 | 值 |
|--------|-----|
| **项目名称** | 走马村「云脉寿岭·荔水走马」前台系统 |
| **代码仓类型** | Monorepo |
| **包管理器** | pnpm (推荐) 或 npm |
| **前端框架** | Next.js 14+ (App Router) + TypeScript strict |
| **后端框架** | NestJS + TypeScript |
| **数据库** | PostgreSQL 15+ + PostGIS |
| **缓存** | Redis 7+ |
| **Node.js** | 20 LTS+ |
| **默认语言** | zh-CN（架构支持 en/ja） |

---

## 2. 目录结构约定（不可偏离）

```
apps/
  web/                  # 前台 PWA — Next.js App Router
    src/
      app/              # 路由页面
        [locale]/       # 多语言路由 (zh-CN/en/ja)
          scenes/       # 四境内容
          booking/      # 院落预约
          tickets/      # 票务
          trees/        # 认养
          me/           # 个人中心
          privacy/      # 隐私中心
      components/       # 页面级组件
      hooks/            # 自定义 Hooks
      lib/              # 工具函数
    public/             # 静态资源
    next.config.js
    package.json
  admin/                # 运营后台 — Next.js App Router
    src/
      app/
        scenes/         # 内容管理
        bookings/       # 预约管理
        tickets/        # 票务管理
        trees/          # 认养管理
        feedback/       # 工单管理
        users/          # 用户管理
        settings/       # 系统设置
services/
  api/                  # 后端 API — NestJS
    src/
      modules/
        auth/           # 鉴权模块
        scenes/         # 四境内容模块
        route/          # 路线生成模块
        booking/        # 院落预约模块
        ticket/         # 票务模块
        tree/           # 认养护模块
        payment/        # 支付模块
        feedback/       # 反馈模块
        privacy/        # 隐私模块
      common/           # 共享装饰器、过滤器、守卫
      config/           # 配置管理
packages/
  ui/                   # 共享 UI 组件库
  contracts/            # API 合约（OpenAPI 规范 + TS 类型）
  prompts/              # AI 提示词模板
  utils/                # 共享工具函数
infra/
  docker/               # Docker Compose / Dockerfile
  terraform/            # 基础设施即代码
docs/
  product/              # 产品文档 (PRD.md 等)
  api/                  # API 文档（OpenAPI 生成）
  mermaid/              # Mermaid 架构图源文件
```

---

## 3. 编码规范

### 3.1 通用规范

```yaml
# 必须遵守
typescript: strict mode（tsconfig strict: true）
formatter: Prettier（项目级 .prettierrc）
linter: ESLint（项目级 eslint.config.js）
git: 每个 PR 保持原子性，一个 PR 只完成一个 Epic 子任务
commit: Conventional Commits（feat:/fix:/docs:/refactor:/test:/chore:）
import: 使用路径别名，禁止 ../../../ 深层相对路径
  - @web → apps/web/src
  - @admin → apps/admin/src
  - @api → services/api/src
  - @ui → packages/ui/src
  - @contracts → packages/contracts/src
  - @prompts → packages/prompts/src
  - @utils → packages/utils/src
```

### 3.2 前端规范（Next.js）

```yaml
组件:
  - 使用 Server Components 作为默认，仅在需要交互时使用 'use client'
  - 每个页面组件必须有 loading.tsx 和 error.tsx
  - 图片使用 next/image，禁止裸 <img> 标签
  - 所有外部链接使用 rel="noopener noreferrer"

状态管理:
  - 服务端状态：Server Components + fetch + revalidate
  - 客户端状态：React Context 或 Zustand（轻量场景）
  - 表单状态：React Hook Form + Zod 校验

样式:
  - 使用 Tailwind CSS 或 CSS Modules
  - 设计令牌定义在 packages/ui/tokens/
  - 响应式设计：Mobile-first（≥375px）→ Tablet（≥768px）→ Desktop（≥1024px）

SEO:
  - 每个页面必须 export metadata（title, description, openGraph）
  - 使用 generateStaticParams 为场景页预渲染

PWA:
  - 配置 next-pwa 或 serwist
  - manifest.json 必须有 name, short_name, icons, start_url

国际化:
  - 所有用户可见文案使用 next-intl 的 useTranslations()
  - 禁止 hardcode 任何面向用户的中文/英文/日文字符串
  - 译文 key 命名：页面.区块.元素（如 scenes.hero.title）
```

### 3.3 后端规范（NestJS）

```yaml
模块化:
  - 每个业务域独立 Module（auth, scenes, route, booking, ticket, tree, payment, feedback, privacy）
  - Controller 只做路由和参数校验，业务逻辑在 Service
  - 跨模块调用通过 Service 注入，不直接访问数据库

校验:
  - 使用 class-validator + class-transformer
  - 所有 DTO 必须有完整的装饰器验证
  - 手机号格式：/^1[3-9]\d{9}$/
  - 日期格式：ISO 8601 (YYYY-MM-DD)

API 设计:
  - 路径：/api/v1/{resource}
  - 分页参数：?page=1&pageSize=20（默认 pageSize=20, max=100）
  - 排序参数：?sortBy=created_at&order=desc
  - 错误响应格式：{ error: { code, message, details? } }
  - 成功响应包裹：{ data, meta?: { total, page, pageSize } }

安全:
  - 所有需要鉴权的接口使用 @Auth() 装饰器
  - 角色隔离使用 @Roles() 装饰器
  - 支付回调验签在 Guard 层完成
  - 所有 LLM 输入使用 PiiSanitizer 清洗后发送
  - 审计日志通过 AuditInterceptor 自动记录

数据库:
  - Migration 使用 TypeORM 或 Prisma Migrate
  - 禁止在生产环境使用 synchronize: true
  - 敏感字段使用 @Column({ select: false })（如手机号）
```

---

## 4. 架构约束

### 4.1 模型编排层

```yaml
# 所有 AI 调用必须通过 ModelProviderAdapter，禁止直接调用模型 API
model_layer:
  adapter: ModelProviderAdapter（packages/utils/src/model-provider/）
  providers:
    - OpenAI (Responses API) → 高质量创作、多模态
    - Anthropic Claude → strict schema、工具调用
    - 百炼/Qwen → 国内替代、高并发
    - DeepSeek → 低成本推理
    - GLM → 知识库检索、结构化输出
  rules:
    - 路由选择基于：任务类型 + 成本预算 + 延迟要求 + 合规要求
    - 所有调用记录：provider, model, tokens_in, tokens_out, cost, latency_ms
    - 高频场景（路线生成、反馈总结）优先使用 mini 或国产模型
    - 禁止每个用户请求都触发 Web Search（$10/1k次，成本极高）
```

### 4.2 数据脱敏规则

```yaml
pii_sanitizer:
  # 以下信息禁止进入任何外部 LLM：
  - 手机号（保留前3后4：138****1234）
  - 精确 GPS 坐标（替换为区域级模糊坐标）
  - 支付单号 / 商户号
  - 身份证号
  - 用户真实姓名
  - 订单金额明细

  # 可以发送给 LLM：
  - 脱敏后的路线参数（时长、人群标签、天气标签）
  - 匿名化的反馈内容
  - 场景描述文案
  - 养护日志内容
```

### 4.3 支付安全

```yaml
payment:
  # 幂等：所有支付请求必须有 idempotent_key，数据库唯一约束
  # 验签：支付回调在到达 Controller 前完成签名校验
  # 超时：下单后 15 分钟未支付，自动取消并释放库存
  # 审计：所有支付操作进入 audit_log 表
  # 沙箱：开发环境必须使用沙箱模式，不允许真实扣款
```

---

## 5. 数据库规则

### 5.1 命名约定

```yaml
表名: snake_case、单数形式（user, courtyard, ticket_order）
  关联表不用复数（tree_adoption, 不是 tree_adoptions）
主键: id（UUID 或 serial）
外键: {table}_id（如 user_id, courtyard_id）
时间: created_at, updated_at（带时区 timestamp）
状态: 使用 enum 类型或 varchar + CHECK 约束
布尔: is_{adjective} 或 has_{noun}（如 is_active, has_child）
JSON: {name}_json（如 rights_json, inputs_json）
```

### 5.2 迁移规范

```yaml
# 每个迁移文件必须：
1. 包含 up() 和 down() 方法
2. 有注释说明变更原因
3. 非空字段设置默认值或先允许 NULL
4. 外键指明 ON DELETE 行为（RESTRICT / CASCADE / SET NULL）
5. 生产环境迁移前在 staging 环境验证
```

---

## 6. 测试要求

### 6.1 测试分层

| 层级 | 覆盖率要求 | 框架 |
|------|-----------|------|
| **单元测试** | 核心业务逻辑 ≥ 80% | Vitest / Jest |
| **API 集成测试** | 每个 API 端点至少一个 happy path + 一个 error case | Supertest |
| **E2E 测试** | 核心流程（下单、支付、认养）全覆盖 | Playwright |
| **合约测试** | API 响应必须通过 OpenAPI schema 校验 | Ajv / openapi-validator |

### 6.2 关键测试场景

```yaml
必须测试:
  - 院落预约：并发预约不超卖（至少 10 并发同一库存）
  - 支付：回调幂等（重复回调不产生重复订单状态变更）
  - 支付超时：库存锁定自动释放
  - 路线生成：三类人群（老人/亲子/普通）三类天气（晴/雨/高温）各至少一个用例
  - 权限：未登录用户访问需鉴权接口 → 401
  - 权限：低权限用户访问高权限接口 → 403
  - 脱敏：LLM 输入中不包含手机号、精确坐标、支付信息
```

---

## 7. PR 规范

### 7.1 分支命名

```
feature/epic-{n}-{description}    # 新功能
fix/{description}                 # 修复
refactor/{description}            # 重构
docs/{description}                # 文档
```

### 7.2 PR 模板

```markdown
## Epic: [Epic编号与名称]

### 变更内容
- [ ] 变更项1
- [ ] 变更项2

### 关联文件
- 新增：`path/to/new/file`
- 修改：`path/to/modified/file`

### 验收清单
- [ ] 本地 `npm run dev` 正常运行
- [ ] `npm run lint` 无错误
- [ ] `npm run type-check` 无错误
- [ ] 相关测试通过 `npm run test -- --related`
- [ ] API 响应符合 OpenAPI 合约
- [ ] 无 hardcode 用户可见文案

### 截图/录屏（前端变更时必填）
（粘贴截图）
```

### 7.3 代码审查要点

```yaml
reviewer 必查:
  - 是否存在 hardcode 字符串（应该从 locale_text 或 i18n 取）
  - 是否直接调用了模型 API（应该走 ModelProviderAdapter）
  - 是否携带了 PII 到外部 API（应该使用 PiiSanitizer）
  - 支付相关是否做了幂等处理
  - 数据库迁移是否包含 up/down 双向
  - 错误处理是否完善（不吞噬异常、不暴露内部错误信息）
```

---

## 8. 环境配置

### 8.1 环境变量模板

```bash
# .env.example
# ---- 应用 ----
NEXT_PUBLIC_APP_NAME=走马村
NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1

# ---- 数据库 ----
DATABASE_URL=postgresql://user:password@localhost:5432/zouma
REDIS_URL=redis://localhost:6379

# ---- 地图 ----
AMAP_JS_API_KEY=
AMAP_WEB_API_KEY=

# ---- 天气 ----
QWEATHER_API_KEY=

# ---- 模型 ----
OPENAI_API_KEY=
OPENAI_DEFAULT_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
DASHSCOPE_API_KEY=         # 阿里云百炼
ZHIPU_API_KEY=              # 智谱

# ---- 支付 ----
WECHAT_PAY_MCH_ID=
WECHAT_PAY_API_KEY=
WECHAT_PAY_SANDBOX=true     # 开发环境必须 true
ALIPAY_APP_ID=
ALIPAY_SANDBOX=true         # 开发环境必须 true

# ---- 安全 ----
JWT_SECRET=
ENCRYPTION_KEY=

# ---- 监控 ----
SENTRY_DSN=
```

### 8.2 本地开发启动

```bash
# 1. 安装依赖
pnpm install

# 2. 启动基础设施（PostgreSQL + Redis）
docker compose -f infra/docker/docker-compose.dev.yml up -d

# 3. 运行数据库迁移
pnpm --filter @zouma/api run db:migrate

# 4. 启动所有服务
pnpm dev
# 前台：http://localhost:3000
# 后台：http://localhost:3001
# API：http://localhost:3002
# API文档：http://localhost:3002/api/docs
```

---

## 9. 禁止事项（红线）

| ❌ 禁止 | ✅ 应该 |
|---------|--------|
| 直接 `fetch('https://api.openai.com/...')` | 使用 `ModelProviderAdapter.complete(prompt, opts)` |
| 用户可见文案写死 `<h1>古道叙事境</h1>` | `<h1>{t('scenes.ancient_road.title')}</h1>` |
| 手机号明文存储或发送到 LLM | 经 `PiiSanitizer.maskPhone()` 处理 |
| `synchronize: true` 在生产环境 | 使用 Migration 管理 schema |
| 支付不加幂等锁 | `idempotent_key` + 数据库唯一约束 |
| 忽略 TypeScript 错误 | 修复或使用 `@ts-expect-error` 加注释 |
| 裸 `console.log` | 使用结构化 logger（Pino / Winston） |
| 前端直接调模型 API | 必须通过 `/api/v1/routes/generate` 等 BFF 接口 |
| 提交 `.env` 文件 | `.env` 在 `.gitignore`，值通过 Vault/CI 注入 |
| 一个 PR 改 20 个文件跨 5 个 Epic | 一个 PR 只属于一个 Epic 的一个子任务 |

---

## 10. AI 提示词管理规则

### 10.1 提示词存放

```
packages/prompts/
  route-generation/          # 路线生成
    system.txt               # 系统提示词
    user-template.txt        # 用户提示词模板
    examples.json            # few-shot 示例
  scene-summary/             # 场景摘要
  feedback-analysis/         # 反馈分析
  translation/               # 翻译
```

### 10.2 提示词规范

```yaml
提示词文件:
  - 使用 .txt（纯文本）或 .json（结构化）- 禁止 .md
  - 包含版本号和更新时间注释
  - 每个提示词有对应的测试用例验证输出格式

输出约束:
  - 所有 AI 输出必须要求 JSON 结构化（通过 schema 约束）
  - 文化/历史类内容必须要求提供 source（来源）和 updated_at（更新时间）
  - 不确定的内容必须标记 confidence（置信度）
```

---

> **总原则**：这些规则的目的不是限制创造力，而是确保由 Codex/Claude 生成的代码可以直接进入 CI 流程、可以被团队维护、不会在生产环境引入安全或合规风险。每一条规则都应该是可被自动化工具验证的。
