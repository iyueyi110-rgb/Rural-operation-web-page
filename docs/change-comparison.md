# 原始改动 vs 新优化方案 — 差异对比

> **原始改动：** Codex 已完成的村民系统 + 全栈集成（commits `d5de19ed..9f94d4f6`，56 个文件）
> **新优化方案：** 本次 Phase A（`docs/optimization-execution.md`，~25 个文件）

---

## 一、总览

```
原始 56 文件 ─┐
               ├─ 38 文件 互不干扰（新方案不动它们）
               ├─  8 文件 重叠（两个方案都改了，需合并）
               └─ 10 文件 被新方案补充（老方案没动）
新  25 文件 ──┘
```

---

## 二、重叠文件（10 个 — 需合并）

| # | 文件 | 原始改动 | 新方案改动 | 冲突？ |
|---|---|---|---|---|
| 1 | `packages/database/prisma/schema.prisma` | +Notification +VisitorInteractionTask +Villager.otpCode/otpExpiry +TreeAdoption.adopterId/interactionTasks +OrchardTree.interactionTasks | +User +UserProfile +Recommendation +RoutePlan +OrchardTree.version/hiddenGeo +TreeAdoption.rightsJson/adopter 关系 | ⚠️ 互补但需有序：adopter 关系依赖 User 模型存在 |
| 2 | `apps/web/src/app/[locale]/page.tsx` | Header 加 1 行：`<Link href="/villager/login">村民入口</Link>` | 替换 Hero/History/Map 三大内容区块（~200 行） | ⚠️ 需手术式编辑：Header 保留原始改动，body 替换为新组件 |
| 3 | `apps/web/src/lib/report-generator.ts` | `generateDailyReport` 末尾加通知钩子 | 末尾加智策卡钩子 + 并行数据获取中加心跳自检 | ⚠️ 互补但需合入同一函数，两个追加点不同 |
| 4 | `apps/web/src/app/api/v1/tree-adoptions/route.ts` | 新增完整 PATCH handler（~60 行） | POST handler 中间加 Redis 锁（~15 行） | ⚠️ 需手术式编辑：POST 里加锁，PATCH 不动 |
| 5 | `apps/web/messages/zh-CN.json / en.json / ja.json` | 文件末尾加 `villagerSystem` 命名空间 | `home` 命名空间内加 hero/history/mapGateway key | ✅ 互补：不同 key，不冲突 |
| 6 | `.env.example` + `.env.local` | +DEEPSEEK +QWEATHER +CRON_SECRET +DATABASE_URL | +REDIS_URL +JWT_SECRET +SMS_API_KEY | ✅ 互补 |
| 7 | `apps/web/src/components/notification-bell.tsx` | 新建文件，读 `localStorage("tourist_phone")` | 改为读 `auth-client.ts` 的 JWT userId，保留 phone fallback | 🔴 需合并：先 JWT 后 phone |
| 8 | `apps/web/src/app/[locale]/trees/adoption-flow.tsx` | 加 `localStorage.setItem("tourist_phone")` | 加 `localStorage.setItem("auth_token")` | 🔴 需合并：两个 key 都写 |
| 9 | `apps/web/src/app/[locale]/trees/[code]/page.tsx` | 加 `InteractionPanel` 组件导入+渲染 | 加 `TreeEnvironmentCard` + `AdoptionRightsPanel` + `GrowthAnimation` | ⚠️ 互补：追加新组件，InteractionPanel 保留 |
| 10 | `apps/web/src/lib/alert-engine.ts` | 加 `createAlertIfAbsent` 内部的通知创建钩子 | `runAlertChecks` 末尾加气象预警→智策卡联动 | ⚠️ 互补：追加在函数末尾 |

---

## 三、不冲突文件（新方案不动它们 — 36 个）

原始 Codex 创建/修改的这些文件，新方案完全不碰：

```
村民门户 (13 文件):           villager/* 全部页面 + layout + error/loading
通知系统 (3 文件):            notifications/route.ts + notification-hooks.ts + care-advisor.ts
互动任务 (5 文件):            interactions/route.ts + upload/route.ts + interaction-*.ts + interaction-panel.tsx
测试文件 (5 文件):            *.test.ts
启动脚本 (3 文件):            start.bat + start.ps1 + start.sh
其他 (7 文件):               layout.tsx + booking-flow + ticket-flow +
                              villager-auth*.ts + villager-portal.ts + villager-page-metadata.ts +
                              tasks/route.ts + notification-bell.tsx(改) + adoption-flow.tsx(改)
```

---

## 四、冲突详情与合并策略

### 冲突 1：notification-bell.tsx

```
原始：const phone = localStorage.getItem("tourist_phone")  →  GET /notifications?recipientId={phone}
新方案：const { userId } = useAuth()  →  GET /notifications?recipientId={userId}
```

**合并策略：** 先读 JWT，取不到时回退读 localStorage phone（过渡期兼容）：

```ts
const { userId } = useAuth()
const effectiveId = userId ?? localStorage.getItem("tourist_phone")?.trim()
if (!effectiveId) return null
// GET /notifications?recipientId={effectiveId}
```

### 冲突 2：adoption-flow.tsx（及 booking-flow、ticket-flow）

```
原始：localStorage.setItem("tourist_phone", phone.trim())
新方案：localStorage.setItem("auth_token", token)
```

**合并策略：** 两个都写（过渡期），JWT 优先：

```ts
localStorage.setItem("tourist_phone", phone.trim())  // 保留旧 key
if (token) localStorage.setItem("auth_token", token)  // 新 key
```

### 冲突 3：page.tsx — Header vs Body

```
原始改动位置：Line 63-65 (Header 导航区，加 villager 链接)
新方案改动位置：Line 122-330 (Hero + Weather + Booking + Realms，替换为三阶流线)
```

**合并策略：** 手术式编辑——Header 区域（Line 50-119）不动，Section 区域（Line 122-330）替换。

### 冲突 4：tree-adoptions/route.ts — POST vs PATCH

```
原始改动位置：Line 73-131 (新增整个 PATCH handler)
新方案改动位置：Line 49 之后 (POST handler 中加锁)
```

**合并策略：** POST handler 中插入锁逻辑。PATCH handler 完整保留。互不覆盖。

---

## 五、新方案净新增（原始没动 — 10 个文件）

| 文件 | 内容 |
|---|---|
| `packages/database/src/redis.ts` | Redis 客户端单例 |
| `apps/web/src/lib/adoption-lock.ts` | 认养分布式锁 |
| `apps/web/src/lib/auth-jwt.ts` | JWT 签发/校验 |
| `apps/web/src/lib/auth-client.ts` | 前端 JWT 存储/读取 |
| `apps/web/src/lib/history-data.ts` | 历史叙事静态数据 |
| `apps/web/src/lib/tree-geo.ts` | GPS→网格 ID 脱敏 |
| `apps/web/src/lib/sms-provider.ts` | 短信通道预留接口 |
| `apps/web/src/lib/recommendation-generator.ts` | 智策卡 AI 生成器 |
| `apps/web/src/components/hero-screen.tsx` | 首页动态首屏 |
| `apps/web/src/components/history-scroll.tsx` | 首页历史长卷 |
| `apps/web/src/components/realm-map-gateway.tsx` | 首页四境地图网关 |
| `apps/web/src/app/api/v1/auth/request-sms/route.ts` | JWT 登录触发 |
| `apps/web/src/app/api/v1/auth/verify-sms/route.ts` | JWT 验证码校验 |
| `apps/web/src/app/api/v1/auth/me/route.ts` | 当前用户信息 |
| `apps/web/src/app/api/v1/recommendations/route.ts` | 智策卡 CRUD |
| `apps/web/src/app/api/v1/recommendations/[id]/approve/route.ts` | 智策卡审核 |
| `infra/docker/docker-compose.dev.yml` | +Redis 服务 |

---

## 六、为 Codex 合并执行的关键指令

### 必须按此顺序执行以避免覆盖：

```
Step 1. Schema：先加 User 模型 → migrate → 再加 adopter 关系 → migrate
         原因：TreeAdoption.adopter → User 的 @relation 依赖 User 模型存在

Step 2. Redis + JWT lib：新建文件，不碰已有文件

Step 3. Auth API：新建 auth/ 路由，不修改已有路由

Step 4. 前端：新建 hero-screen / history-scroll / realm-map-gateway
         作为独立组件，在 page.tsx 中逐段替换

Step 5. 修改已有文件时，对以下文件使用 SURGICAL EDIT（精确 old→new 替换）：
   - page.tsx          → 只替换 Section 区域，不动 Header
   - tree-adoptions    → 只改 POST handler，不动 PATCH
   - report-generator  → 只在函数末尾追加
   - notification-bell → 只改 phone 读取逻辑（加 fallback）
   - adoption-flow     → 只改 localStorage 写入（两个 key 都写）
   - i18n              → 只在 home 命名空间内追加 key
```

### 禁止操作：

- ❌ 不要重写/覆盖 page.tsx —— Header 区保留原始改动
- ❌ 不要重写/覆盖 tree-adoptions/route.ts —— PATCH handler 必须完整保留
- ❌ 不要删除 `localStorage("tourist_phone")` —— 保留作为 JWT 过渡期 fallback
- ❌ 不要在 User 模型创建前执行 adopter 关系迁移
