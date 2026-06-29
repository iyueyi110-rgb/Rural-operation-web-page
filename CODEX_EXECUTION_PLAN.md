# Codex 执行指令：走马村云脑系统完善与降级方案

> **生成日期**: 2026-06-30
> **执行目标**: 补齐系统缺口，对无法接入的 API 做优雅降级，确保全链路可演示
> **核心原则**: 不破坏现有功能、所有降级方案必须有可见的 UI 反馈、优先保障展示效果

---

## ⚠️ 全局注意事项

1. **禁止删除任何现有代码或数据模型**，只做增量添加
2. **所有新增模型必须通过 Prisma migrate**，不允许手动改数据库
3. **修改前先 `git checkout -b fix/cloud-brain-p0`** 建新分支
4. **每完成一个 Phase 做一次 `git commit`**，提交信息用 Conventional Commits 格式
5. **所有 mock 降级方案必须在 UI 上明确标注"演示模式"**，不可伪装成真实接入
6. **保留 `.env.example` 同步更新**，新增环境变量要加注释
7. **重要**：所有 `userId` 外键字段不添加 Prisma relation 到 User 模型，避免循环依赖。用 plain `String` 字段在应用层做 join 即可

---

## 📋 复核记录（2026-06-30）

本计划已与代码仓实际情况逐项交叉验证，以下为关键发现与修正：

| 检查项 | 结果 | 处理 |
|--------|------|------|
| `Courtyard` 模型 vs 现有 `CourtyardActivity.courtyardId` | ✅ 兼容 | 需在 migration 时处理已有数据 |
| `TicketOrder` 模型 vs 现有 `ticket-orders/route.ts` | ⚠️ 冲突 | API 目前用 mock 数据，模型建好后需迁移数据源 |
| `UnifiedOrder` 缺少 `userId` | 🔴 阻塞 | Phase 5 新增 `userId` 字段的独立 migration |
| `me/page.tsx` 当前实现状态 | ⚠️ 误判 | 已有订单展示但使用静态 mock 数据，改为迁移至真实 API |
| `TreeAdoption.adopterId` 字段 | ✅ 已存在 | 可直接用于 Phase 5.2 认养查询 |
| JWT 解析 `userId` 可用 | ✅ 已实现 | `auth/me/route.ts` 已验证 `verifyJWT` → `session.userId` |
| 村民端 client 组件 | ✅ 已实现 | login(131行)/dashboard(105行)/tasks(71行)/earnings(52行)/notifications(138行) |
| feedback-admin.tsx | ✅ 已有 298 行 | 非占位，是完整实现 |
| DeepSeek / QWeather / AMap | ✅ 已接入 | `.env.local` 中已配置有效 Key |
| SMS / IoT Sensor | ❌ 未接入 | 降级方案已覆盖 |

---

## Phase 1: 补齐缺失数据模型（P0，预计 2-3 小时）

### 1.1 新增 `Courtyard` 模型

> 当前状态：`courtyard-bookings` API（`apps/web/src/app/api/v1/courtyard-bookings/route.ts`）和前台 booking 页面（`booking-flow.tsx`）均使用 `lib/courtyards-data.ts` 静态 mock 数据。无持久化存储。

**文件**: `packages/database/prisma/schema.prisma`

在 `model CourtyardActivity` 之前新增：

```prisma
model Courtyard {
  id            String   @id @default(cuid())
  name          String
  sceneRealm    String
  capacity      Int
  inventoryType String   @default("entire_house")
  priceRule     Json     @default("{}")
  status        String   @default("active")
  locationGeo   String?
  description   String?  @db.Text
  amenities     Json     @default("[]")
  images        Json     @default("[]")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  activities    CourtyardActivity[]

  @@index([sceneRealm, status])
  @@map("courtyard")
}
```

同时修改 `CourtyardActivity`，将 `courtyardId String` 改为关联字段：

```prisma
model CourtyardActivity {
  id            String            @id @default(cuid())
  courtyardId   String
  courtyard     Courtyard         @relation(fields: [courtyardId], references: [id])
  // ... 其余字段保持不变
}
```

**执行**: `cd packages/database && npx prisma migrate dev --name add_courtyard_model`
> ⚠️ 如果数据库中已有 `courtyard_activity` 行且 `courtyardId` 值不是有效的 Courtyard ID，需要先用 seed 建 Courtyard 行再关联。

**后续迁移**: 在 Phase 7 seed 完成后，将 `courtyard-bookings/route.ts` 和 `booking-flow.tsx` 从读取 `courtyards-data.ts` 改为调用 Prisma 查询 `Courtyard` 表。**保留 `courtyards-data.ts` 文件不变**（其他代码可能引用）。

**Seed 数据**: 在 `packages/database/prisma/seed.ts` 中插入 4 个院落（每境 1 个），需与 `courtyards-data.ts` 中的 ID 和名称对应

---

### 1.2 新增 `TicketProduct` + `TicketOrder` 模型

> 当前状态：`ticket-orders` API（`apps/web/src/app/api/v1/ticket-orders/route.ts`）使用 `lib/tickets-data.ts` 静态 mock 数据，无持久化。`TicketProduct` 表和 `TicketOrder` 表均不存在。

```prisma
model TicketProduct {
  id          String        @id @default(cuid())
  name        String
  category    String        // scenic / activity / package
  price       Float
  totalStock  Int           @default(100)
  soldCount   Int           @default(0)
  status      String        @default("on_sale")
  validFrom   String?
  validTo     String?
  description String?       @db.Text
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  orders      TicketOrder[]

  @@index([category, status])
  @@map("ticket_product")
}

model TicketOrder {
  id          String        @id @default(cuid())
  productId   String
  userId      String?
  quantity    Int           @default(1)
  totalAmount Float         @default(0)
  guestName   String?
  guestPhone  String?
  status      String        @default("pending_payment")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  product     TicketProduct @relation(fields: [productId], references: [id])

  @@index([userId, createdAt])
  @@index([guestPhone, createdAt])
  @@map("ticket_order")
}
```

**执行**: `cd packages/database && npx prisma migrate dev --name add_ticket_models`

**后续迁移**: Phase 7 seed 完成后，将 `ticket-orders/route.ts` 从读取 `tickets-data.ts` 改为 Prisma 查询。**保留 `tickets-data.ts` 不变**。

---

### 1.3 新增 `ConsentRecord` + `AuditLog` 模型

> 当前状态：两个模型均不存在。隐私中心页面（`privacy/page.tsx`）已实现但无可持久化的授权记录。无任何审计日志。

```prisma
model ConsentRecord {
  id          String   @id @default(cuid())
  userId      String
  consentType String   // privacy_policy / data_collection / ai_processing / location
  granted     Boolean  @default(true)
  ipAddress   String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([userId, consentType])
  @@index([userId])
  @@map("consent_record")
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String   // payment_callback / tree_update / price_change / refund / user_delete
  targetType String
  targetId   String?
  detail     Json     @default("{}")
  ipAddress  String?
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([actorId, createdAt])
  @@index([action, createdAt])
  @@map("audit_log")
}
```

**执行**: `cd packages/database && npx prisma migrate dev --name add_privacy_audit_models`

> 💡 `userId` / `actorId` 使用 plain `String` 类型（不添加 Prisma relation），避免与 `User` 模型产生循环依赖。在 API 层通过 `verifyJWT` 获取当前用户 ID 后填入。

---

## Phase 2: 支付系统降级方案（P0，预计 3-4 小时）

> 🔴 微信/支付宝沙箱无法在本阶段真实接入 → **采用全链路演示降级**

### 2.1 新增 PaymentOrder 模型

```prisma
model PaymentOrder {
  id             String    @id @default(cuid())
  orderType      String    // courtyard_booking / tree_adoption / ticket_order / activity_booking
  orderId        String
  userId         String?
  amount         Float
  channel        String    @default("mock_demo") // wechat / alipay / mock_demo
  status         String    @default("pending") // pending / paid / refunded / expired
  idempotentKey  String    @unique
  paidAt         DateTime?
  expiresAt      DateTime?
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([orderType, orderId])
  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@map("payment_order")
}
```

**执行**: `cd packages/database && npx prisma migrate dev --name add_payment_order`

### 2.2 新增降级支付 API

> ⚠️ 以下 3 个 API 路由目前**全部不存在**，需从零创建。

**文件**: `apps/web/src/app/api/v1/payments/prepare/route.ts`

```
POST /api/v1/payments/prepare
```

实现逻辑：
1. 从 JWT 解析 `userId`（用 `getBearerToken` + `verifyJWT`，如有）
2. 接收 `{ orderType, orderId, amount, channel }`
3. 生成 `idempotentKey = crypto.randomUUID()`
4. 创建 `PaymentOrder` 记录，状态为 `pending`
5. 返回 `{ paymentOrderId, qrCodePlaceholder: true, demoMode: true, hint: "演示模式：点击确认支付即可完成" }`

**文件**: `apps/web/src/app/api/v1/payments/confirm/route.ts`

```
POST /api/v1/payments/confirm
```

实现逻辑：
1. 接收 `{ paymentOrderId }`
2. 将 PaymentOrder 状态置为 `paid`，记录 `paidAt = new Date()`
3. 根据 `orderType` 同步更新对应订单表的 status 字段（`UnifiedOrder` / `TreeAdoption` / `TicketOrder` 等）
4. 写入 `AuditLog`（action: `payment_callback`, targetType: `payment_order`, targetId: paymentOrderId）
5. 返回 `{ success: true, demoMode: true }`

**文件**: `apps/web/src/app/api/v1/payments/[id]/route.ts`

```
GET /api/v1/payments/[id]
```

查询支付单状态。需校验：匿名用户可查（用 `idempotentKey`），登录用户可查自己订单。

### 2.3 支付 UI 降级组件

创建 `apps/web/src/components/demo-payment-dialog.tsx`：

- 模态弹窗，显示支付金额、订单信息
- 按钮文字：「确认支付（演示模式）」
- 黄色背景提示条："⚠️ 当前为演示模式，不涉及真实资金"
- 点击后调用 `POST /api/v1/payments/confirm`
- 成功后跳转到订单确认页

> 样式参考现有 `SystemModuleCard` 组件风格，保持和项目视觉语言一致

---

## Phase 3: 补全薄 API 路由（P0-P1，预计 2-3 小时）

### 3.1 需增强的 8 个路由

| 路由 | 当前行数 | 需增加 | 具体改动 |
|------|---------|--------|----------|
| `trees/route.ts` | 11 | 分页+筛选 | 添加 `?page=&limit=&species=&adoptStatus=` query 参数 |
| `nodes/route.ts` | 20 | 分页+筛选 | 添加 `?realm=&nodeType=&page=&limit=` query 参数 |
| `weather/alerts/route.ts` | 11 | 真实逻辑 | 接入 `weather-alerts.ts` 库，返回结构化预警数据 |
| `infrastructure/decide/route.ts` | 20 | 决策逻辑 | 基于告警+客流数据生成建议，若无数据返回降级提示 |
| `infrastructure/alerts/route.ts` | 16 | 数据聚合 | 汇总 sensor + weather + device 告警 |
| `analytics/cross/flow-vs-spend/route.ts` | 13 | 数据分析 | 客流-消费交叉分析，样本数据不足时返回降级说明 |
| `reports/latest/route.ts` | 15 | 报表端点 | 返回最新日报，若无日报返回空态 |
| `devices/[deviceId]/readings/route.ts` | 20 | 时间范围 | 添加 `?from=&to=&limit=` query 参数 |

### 3.2 统一分页响应格式

所有列表接口统一使用：

```ts
{
  data: T[],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

---

## Phase 4: 无法接入 API 的降级方案（P1，预计 1-2 小时）

### 4.1 短信服务降级

> 🔴 SMS_API_KEY 为空，短期内无法接入真实短信

**不改动后端逻辑**。完善前端降级体验：

**文件**: `apps/web/src/components/otp-demo-banner.tsx`（新建）

- 在 OTP 验证码输入框上方显示蓝色信息条
- 内容："📱 演示模式：验证码将显示在页面中，无需等待短信"
- OTP 码直接渲染到页面（当前已在 `console.log` 打印，改为页内可见）
- 仅当 `process.env.NODE_ENV === "development"` 时显示，生产环境自动隐藏

> ⚠️ **安全注意**：该组件必须用 `process.env.NODE_ENV` 做条件渲染，生产构建时完全不展示验证码明文。

**村民端**同理（`apps/web/src/app/[locale]/villager/login/villager-login-client.tsx`）：在 OTP 输入区上方插入 `<OtpDemoBanner otpCode={...} />`

### 4.2 IoT 传感器降级

> 🔴 无硬件部署，SENSOR_API_KEY 为空

**文件**: `apps/web/src/app/api/v1/devices/readings/route.ts`

- 接收传感器上报时，不返回 401
- 改为接受数据但标记 `source: "demo_simulated"`
- 若无真实数据，dashboard 图表显示空态说明："传感器数据待硬件部署后接入"

**文件**: `apps/admin/src/components/active-alerts-panel.tsx`

- 在告警面板加一行提示："设备接入：演示模式（无物理传感器）"

### 4.3 AI 功能已接入 — 只需增加容错降级

> ✅ DeepSeek API Key 已配置，但需防网络异常

**所有 AI API 路由**需包裹 try-catch：

```ts
try {
  const aiResult = await callDeepSeek(...)
  return jsonResponse(request, { data: aiResult })
} catch (error) {
  // 降级：返回预设回复
  return jsonResponse(request, {
    data: { content: getFallbackResponse(queryType), source: "fallback" },
    meta: { degraded: true, reason: "AI 服务暂时不可用，显示预设内容" }
  })
}
```

在 `packages/prompts/` 中新增 `fallback-responses.ts`，预设各类场景的兜底文案。

---

## Phase 5: 完善个人中心 API（P0，预计 1-2 小时）

> **背景说明**:
> - `me/page.tsx` 已展示订单卡片，但数据来自静态文件 `lib/me-data.ts`（仅 3 条 mock 数据），非真实用户数据
> - `UnifiedOrder` 表**缺少 `userId` 字段**，无法按用户筛选
> - `TreeAdoption` 表已有 `adopterId` 字段，可直接用于个人认养查询

### 5.1 给 `UnifiedOrder` 添加 `userId` 字段

**文件**: `packages/database/prisma/schema.prisma`

在 `model UnifiedOrder` 的 `status` 字段前添加：

```prisma
userId      String?
```

并在文件底部添加索引：

```prisma
@@index([userId, createdAt])
```

**执行**: `cd packages/database && npx prisma migrate dev --name add_unified_order_user_id`

> ⚠️ 这是一个**对已有表的增量修改**，Prisma 会自动处理已有行的 `userId` 为 NULL。不影响现有功能。

### 5.2 新增 API 路由

**文件**: `apps/web/src/app/api/v1/me/orders/route.ts`

```
GET /api/v1/me/orders?type=courtyard_booking|tree_adoption|ticket_order
```

1. 从 JWT 解析 `userId`（`getBearerToken` + `verifyJWT`）
2. 查询 `UnifiedOrder`，按 `userId` + `orderType` 筛选
3. 返回 `{ data: [...], meta: { total } }`

**文件**: `apps/web/src/app/api/v1/me/adoptions/route.ts`

```
GET /api/v1/me/adoptions
```

1. 从 JWT 解析 `userId`
2. 查询 `TreeAdoption`，按 `adopterId` 筛选，include `tree`（关联 `OrchardTree`）
3. 返回 `{ data: [...], meta: { total } }`

### 5.3 迁移前端数据源

**文件**: `apps/web/src/app/[locale]/me/page.tsx`

当前使用 `import { memberOrders } from "@web/lib/me-data"`（静态 3 条数据）。

改为：
- 创建 `"use client"` wrapper 组件调用 `GET /api/v1/me/orders` + `GET /api/v1/me/adoptions`
- 有 JWT 登录态时展示真实订单/认养数据
- 未登录时展示引导卡片："登录后查看您的订单和认养"
- 已登录但无数据时展示空态："您还没有订单，去认养一棵荔枝树吧"（带 CTA 链接）
- 保留 `me-data.ts` 作为类型参考，不删除

---

## Phase 6: 隐私与审计完善（P0，预计 1 小时）

### 6.1 隐私授权 API

**文件**: `apps/web/src/app/api/v1/privacy/consents/route.ts`

```
GET  /api/v1/privacy/consents          — 查询用户授权状态
POST /api/v1/privacy/consents          — 记录授权（同意/撤销）
```

### 6.2 隐私中心页增强

**文件**: `apps/web/src/app/[locale]/privacy/page.tsx`

- 展示 4 项授权开关（隐私政策、数据采集、AI 处理、位置信息）
- 每项有独立 toggle
- 显示授权时间

### 6.3 关键操作写入审计日志

在以下 API 中插入 `AuditLog` 写入：
- 支付确认（`payments/confirm`）
- 树木信息修改（`trees/[code]` PUT）
- 退款操作（后续实现）
- 用户数据删除（后续实现）

---

## Phase 7: 数据库 Seed 完善（P1，预计 1 小时）

**文件**: `packages/database/prisma/seed.ts` 和 `packages/database/prisma/seed-demo.ts`

新增 seed 数据：

| 表 | 数量 | 说明 |
|----|------|------|
| Courtyard | 4 条 | 每境 1 个院落，需与 `courtyards-data.ts` 中 ID 一致 |
| TicketProduct | 6 条 | 景点票×2、活动票×2、套餐票×2 |
| PaymentOrder | 5 条 | 各种状态的演示支付单（已过期/待支付/已支付/已退款） |
| ConsentRecord | 4 条 | 为一个 demo 用户创建 4 类授权项 |
| UnifiedOrder | 补充 `userId` | 给已有订单行填充 demo userId |

**运行**: `cd packages/database && npx prisma db seed`

> ⚠️ seed 脚本需支持**幂等运行**（用 `upsert` 而非 `create`），避免重复执行报错。

---

## 执行顺序与依赖

```
Phase 1 (新增4个数据模型)
  ├─→ 1.1 Courtyard + CourtyardActivity 关联
  ├─→ 1.2 TicketProduct + TicketOrder
  ├─→ 1.3 ConsentRecord + AuditLog
  └─→ Phase 7 (seed 数据填充)

Phase 5.1 (UnifiedOrder 添加 userId) ← 独立迁移，可与其他并行
  └─→ Phase 5.2 (me/orders API)
        └─→ Phase 5.3 (me/page.tsx 迁移)
  
Phase 2 (支付降级)
  ├─→ 2.1 PaymentOrder 模型
  ├─→ 2.2 支付 API (prepare/confirm/[id])
  └─→ 2.3 支付 UI 组件

Phase 3 (API补全) ─┐
Phase 4 (降级方案) ─┤  可并行
Phase 6 (隐私审计) ─┘
  └─→ 全链路联调测试
```

**关键路径**: Phase 1 → Phase 7 → Phase 2 + Phase 5 → 联调

**最晚完成**: Phase 1.1 + 1.2 必须先完成，Phase 2（支付）和 Phase 5（个人中心）依赖数据库模型就绪。

---

## 验证清单

完成所有 Phase 后，逐项检查：

- [ ] `npx prisma migrate status` 显示所有迁移已应用
- [ ] `pnpm dev` 启动无报错
- [ ] 访问 `http://localhost:3000/zh-CN` 首页正常
- [ ] 访问 `http://localhost:3001/dashboard` 后台正常
- [ ] 院落预约流程：选择院落 → 填写信息 → Mock 支付弹窗 → 确认页
- [ ] 树木认养流程：选择树木 → 填写信息 → Mock 支付弹窗 → 认养成功
- [ ] 门票购买流程：选择票种 → Mock 支付弹窗 → 订单确认
- [ ] 村民登录 → OTP 码在页面可见（开发环境）→ 任务列表 → 收益查看 → 通知中心
- [ ] 个人中心 → 登录后可见"我的订单"和"我的认养" → 未登录显示引导
- [ ] 隐私中心 → 4 项授权开关可切换并持久化
- [ ] AI 问答返回正常（路线上/活动/天气），AI 不可用时降级显示预设文案
- [ ] 天气 Widget 显示真实天气数据（QWeather 已接入）
- [ ] 支付弹窗标注"演示模式：不涉及真实资金"清晰可见
- [ ] OTP 演示提示条仅开发环境显示
- [ ] seed 数据可重复运行不报错（upsert 幂等）
- [ ] 现有功能不受影响：四境浏览、路线生成、反馈提交、农事日历等正常

---

## 降级方案总结

| 无法接入的服务 | 降级方式 | UI 标注 |
|---------------|----------|---------|
| 微信/支付宝支付 | Mock 支付确认 API + 演示弹窗 | "演示模式：不涉及真实资金" |
| 短信 SMS | 页面内显示验证码 + 蓝色提示条 | "演示模式：验证码已显示在页面中" |
| IoT 传感器 | 接受演示数据 + 空态说明 | "传感器数据待硬件部署后接入" |
| AI 异常 | 预设 fallback 回复 | "AI 服务暂时不可用，显示预设内容" |
