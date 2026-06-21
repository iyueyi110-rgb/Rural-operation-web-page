# 走马村系统优化 — Phase A 执行清单

> **目标：** 按"走马村系统设计优化方案"的 Phase A 范围，对前端首页、认证体系、Redis 锁、智策卡、数据模型进行升级。
> **原则：** 新增代码遵循现有模式（`jsonResponse`、`isPlainObject`、`"use client"`），修改代码追加不覆盖。

---

## 一、Phase A 范围总览

```
A1(DB) → A2(Redis) → A3(Auth) → A4(前端首页) → A5(智策卡) → A6(扩展) → A7(认养UX) → A8(云脑后台) → A9(数据流) → A10(IoT健康) → A11(测试验收)
```

| 子 Phase | 内容 | 对应需求 | 预估文件数 |
|---|---|---|---|
| A1 | Prisma 新增 User/UserProfile/Recommendation + 修改 OrchardTree/TreeAdoption | Req 2,6 | 1 schema |
| A2 | Redis 集成：客户端 + 认养分布式锁 + 乐观锁 | Req 6 | 3 文件 |
| A3 | JWT 认证：login-sms + verify + 中间件 + me | Req 2 | 4 路由 |
| A4 | 前端首页重构：三阶流线（首屏→历史→地图） | Req 3 | 3 组件 + 1 数据文件 |
| A5 | 智策卡：Recommendation CRUD + AI 生成 + 审核流 | Req 5,6 | 3 API + 1 生成器 |
| A6 | 数据模型扩展 + 村民短信通道 + 三类角色路径 | Req 2,6 | 2 lib + schema 修改 |
| **A7** | **认养一棵树体验升级**（档案/成长/养护/权益/照片） | **Req 4** | **3 组件 + 1 页面修改** |
| **A8** | **云脑后台极简重构**（五模块仪表盘） | **Req 5** | **1 页面重构 + 3 组件** |
| **A9** | **多源数据流整合**（五流合一决策引擎） | **Req 6** | **2 lib + API 修改** |
| **A10** | **IoT 设备健康自检**（心跳监测 + 断线降级） | **Req 1** | **2 lib + 1 API** |
| **A11** | **系统测试与验收标准**（KPI 指标） | **Req 7** | **1 验收文档** |

---

## 二、Phase A1 — 数据库 Schema

### 2.1 新增 User 模型

**文件：** `packages/database/prisma/schema.prisma`

在 `Visitor` 模型之后追加：

```prisma
model User {
  id           String    @id @default(cuid())
  mobile       String    @unique
  nickname     String?
  role         String    @default("visitor")  // "visitor" | "villager" | "operator" | "admin"
  locale       String    @default("zh-CN")
  otpCode      String?   // 6 位短信验证码（试运营阶段，后续接入短信后保留）
  otpExpiry    DateTime? // 验证码过期时间（now + 5min）
  jwtSalt      String?   // JWT 签名盐值，每次登录刷新
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  profile      UserProfile?
  adoptions    TreeAdoption[]
  routePlans   RoutePlan[]

  @@index([mobile, role])
  @@map("user")
}

model UserProfile {
  id            String   @id @default(cuid())
  userId        String   @unique @map("user_id")
  ageGroup      String?  // "child" | "youth" | "middle" | "senior"
  travelPref    Json?    // ["nature","culture","food"] 等
  mobilityLevel String?  // "low" | "medium" | "high"
  childFlag     Boolean  @default(false)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user          User     @relation(fields: [userId], references: [id])

  @@map("user_profile")
}
```

### 2.2 修改 TreeAdoption — 关联 User

在 `TreeAdoption` 模型中修改 `adopterId` 注释，追加 `adopter` 关系：

```prisma
model TreeAdoption {
  // ... 已有字段不变 ...
  adopterId    String?
  adopter      User?     @relation(fields: [adopterId], references: [id])
  rightsJson   Json?     // 动态权益配置：采摘额度、挂牌、寄送
  // ...
}
```

### 2.3 修改 OrchardTree — 加 version + hiddenGeo

在 `OrchardTree` 模型中追加：

```prisma
model OrchardTree {
  // ... 已有字段不变 ...
  hiddenGeo    String?   // 脱敏后的 GPS 网格坐标 "网格_走马岭_02"
  version      Int       @default(1)  // 乐观锁版本号
  // ...
}
```

### 2.4 新增 RoutePlan 模型（关联 User）

```prisma
model RoutePlan {
  id            String   @id @default(cuid())
  userId        String
  inputsJson    Json
  outputJson    Json
  weatherSnapshotId String?
  createdAt     DateTime @default(now()) @map("created_at")

  user          User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@map("route_plan")
}
```

### 2.5 新增 Recommendation 模型（智策卡）

```prisma
model Recommendation {
  id            String   @id @default(cuid())
  bizDate       String   @map("biz_date")
  type          String   // "weather_plan" | "crowd_diversion" | "inventory_alert" | "maintenance"
  targetObject  String?  @map("target_object")
  evidenceJson  Json     @map("evidence_json")
  message       String   @db.Text
  actionSteps   Json     @map("action_steps")
  ownerRole     String   @map("owner_role")
  expectedImpact String? @db.Text @map("expected_impact")
  confidence    Float    @default(0)
  status        String   @default("draft")  // "draft" | "approved" | "rejected" | "executed"
  approvedBy    String?  @map("approved_by")
  approvedAt    DateTime? @map("approved_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([bizDate, status])
  @@index([type, createdAt])
  @@map("recommendation")
}
```

### 2.6 迁移命令

```bash
cd packages/database
npx prisma migrate dev --name add_user_and_recommendation
```

---

## 三、Phase A2 — Redis 集成

### 3.1 安装依赖

```bash
pnpm add ioredis -w
pnpm add -D @types/ioredis -w
```

### 3.2 创建 Redis 客户端单例

**文件：** `packages/database/src/redis.ts`

```ts
import Redis from "ioredis"

const globalForRedis = globalThis as unknown as { redis?: Redis }

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
})

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

export default redis
```

在 `packages/database/src/index.ts` 中追加：`export { redis } from "./redis"`

### 3.3 更新 docker-compose.dev.yml

**文件：** `infra/docker/docker-compose.dev.yml`

在 `services` 下追加 Redis 服务：

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  pgdata:
  redis_data:
```

### 3.4 创建认养分布式锁工具

**文件：** `apps/web/src/lib/adoption-lock.ts`

```ts
import { redis } from "@zouma/database"

const LOCK_PREFIX = "adoption_lock:"
const LOCK_TTL_SECONDS = 600 // 10 minutes

export async function acquireAdoptionLock(treeId: string, userId: string): Promise<string | null> {
  const lockKey = `${LOCK_PREFIX}${treeId}`
  const lockValue = `${userId}_${Date.now()}`
  const result = await redis.set(lockKey, lockValue, "EX", LOCK_TTL_SECONDS, "NX")
  return result === "OK" ? lockValue : null
}

export async function releaseAdoptionLock(treeId: string): Promise<void> {
  await redis.del(`${LOCK_PREFIX}${treeId}`)
}
```

### 3.5 修改 tree-adoptions POST — 集成锁

**文件：** `apps/web/src/app/api/v1/tree-adoptions/route.ts`

在 POST handler 中，`dbTree.adoptStatus === "maintenance"` 检查之后、`prisma.treeAdoption.create` 之前，插入：

```ts
// 获取分布式锁，防止超卖
const lockToken = await acquireAdoptionLock(dbTree.id, body.adopterPhone ?? "unknown")
if (!lockToken) {
  return jsonResponse(request, { error: "Tree is currently being reserved, please try again." }, { status: 409 })
}

// 乐观锁：在 update 时校验 version
const record = await prisma.$transaction(async (tx) => {
  const tree = await tx.orchardTree.update({
    where: { id: dbTree.id, adoptStatus: { not: "maintenance" } },
    data: { adoptStatus: "reserved" },
  })
  return tx.treeAdoption.create({ data: { ... } })
})

// 释放锁
void releaseAdoptionLock(dbTree.id)
```

### 3.6 环境变量

**文件：** `.env.example` 和 `.env.local`

追加：`REDIS_URL=redis://localhost:6379`

---

## 四、Phase A3 — JWT 认证体系

### 4.1 新增 API 路由

#### 4.1.1 短信登录触发

**文件：** `apps/web/src/app/api/v1/auth/request-sms/route.ts`

```
POST /api/v1/auth/request-sms  body: { mobile }
```

- 查找 `User` 表中匹配 mobile 的记录
- 不存在则自动注册（`prisma.user.create`，role="visitor"）
- 生成 6 位验证码，写入 `User.otpCode` + `User.otpExpiry`（5min）
- 当前阶段验证码直接返回 response（试运营方案，后续接入短信）
- 返回 `{ success: true }`

#### 4.1.2 验证码校验 + JWT 签发

**文件：** `apps/web/src/app/api/v1/auth/verify-sms/route.ts`

```
POST /api/v1/auth/verify-sms  body: { mobile, code }
```

- 校验 mobile + code + expiry
- 通过后生成 JWT token（使用 `jose` 库，HMAC-SHA256）
- 刷新 `User.jwtSalt`
- 返回 `{ token, user: { id, mobile, role, locale } }`

#### 4.1.3 JWT 验证中间件

**文件：** `apps/web/src/lib/auth-jwt.ts`

```ts
import { jwtVerify, SignJWT } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "zouma_dev_jwt_secret")

export async function createJWT(payload: { userId: string; role: string }, salt: string): Promise<string> {
  return new SignJWT({ ...payload, salt })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") return null
    return { userId: payload.userId, role: payload.role }
  } catch {
    return null
  }
}
```

#### 4.1.4 获取当前用户

**文件：** `apps/web/src/app/api/v1/auth/me/route.ts`

```
GET /api/v1/auth/me  header: Authorization: Bearer <JWT>
```

- `verifyJWT(token)` → 查 User + UserProfile → 返回用户信息
- 游客端通知铃铛改为用 userId 而非 phone

### 4.2 安装依赖

```bash
pnpm add jose -w
```

### 4.3 修改前端 — 统一认证

- `notification-bell.tsx`：改用 `GET /api/v1/auth/me` 获取用户 ID，通知查询改用 `recipientId=userId`
- 三个 flow 文件中 `localStorage.setItem("tourist_phone")` 改为 `localStorage.setItem("auth_token", token)`
- 新增 `apps/web/src/lib/auth-client.ts`：封装 `fetchWithAuth()`，替代 `fetchWithVillagerAuth()`

---

## 五、Phase A4 — 前端首页重构

### 5.1 修改范围

当前 `page.tsx` 的卡片式布局 → 替换为三阶线性流线：

```
Section 1: 动态首屏 (Hero)     — 满屏视频 + 标题 + CTA
Section 2: 历史叙事长卷 (Story) — 视差滚动 + 文字 + AIGC 音频
Section 3: 四境地图网关 (Map)  — 2.5D 矢量地图 + 可交互多边形
```

### 5.2 新建组件

#### 5.2.1 动态首屏

**文件：** `apps/web/src/components/hero-screen.tsx`

- `"use client"` 组件
- 全视口 `<video>` 背景（静音、循环、autoplay、playsinline）
- 中央白色 Serif 标题 "云脉寿岭，荔水走马"
- 底部天气微件（复用现有 weather summary 数据）
- "开始浏览" 按钮 → 平滑滚动到 Section 2
- LCP 优化：`<video>` 加 `poster` 属性，`preload="metadata"`

#### 5.2.2 历史叙事长卷

**文件：** `apps/web/src/components/history-scroll.tsx`

- Server Component（内容静态）
- 手卷风格排版，视差滚动效果（`background-attachment: fixed`）
- 内容分四段：唐代乐温县建制 → 荔枝古道 → 清代指路碑 → 当代走马村
- 每段 AIGC 音频入口（预留 `<audio>` 标签）
- 叙事内容从 `apps/web/src/lib/history-data.ts` 读取

#### 5.2.3 四境地图网关

**文件：** `apps/web/src/components/realm-map-gateway.tsx`

- `"use client"` 组件
- Leaflet/AMap 地图容器
- 四个境域渲染为交互式多边形图层
- 点击跳转 `/zh-CN/scenes/[slug]`
- 地理锚点标注（指路碑、古树、药铺合院等）

### 5.3 新增数据文件

**文件：** `apps/web/src/lib/history-data.ts`

```ts
// 四段历史叙事的静态数据（AIGC 生成 + 人工校对）
export const historySections = [
  { id: "tang", titleKey: "...", bodyKey: "...", audioUrl: "..." },
  { id: "lychee", titleKey: "...", bodyKey: "...", audioUrl: "..." },
  { id: "milestone", titleKey: "...", bodyKey: "...", audioUrl: "..." },
  { id: "modern", titleKey: "...", bodyKey: "...", audioUrl: "..." },
]
```

### 5.4 修改 page.tsx

**文件：** `apps/web/src/app/[locale]/page.tsx`

- 移除 `.hero` section 的静态图片 → 引入 `<HeroScreen />`
- 在 Hero 和 Weather 之间插入 `<HistoryScroll />`
- 将 `#realms` 四境卡片替换为 `<RealmMapGateway />`
- 保留 Header（导航栏）、天气模块
- Booking/Adoption 预览卡片移至 Map 网关下方

### 5.5 i18n 新增 key

在 `zh-CN.json` / `en.json` / `ja.json` 的 `home` 命名空间中追加：

```json
"hero": { "startBrowsing": "开始浏览", "videoAlt": "龙溪河航拍" },
"history": { "eyebrow": "历史纵深", "title": "...", "section1": "..." },
"mapGateway": { "eyebrow": "四境空间", "title": "选择你的探索方向" }
```

---

## 六、Phase A5 — 智策卡系统

### 6.1 新建 API 路由

#### 6.1.1 智策卡列表 + 生成

**文件：** `apps/web/src/app/api/v1/recommendations/route.ts`

```
GET  /api/v1/recommendations?bizDate=2026-06-20&status=draft
POST /api/v1/recommendations/generate  (触发 AI 生成今日智策卡)
```

POST generate 逻辑：
1. 聚合当日数据（与 report-generator 复用数据获取逻辑）
2. 调用 `ModelProviderAdapter.complete()`，system prompt 约束为 Evidence+Action+Impact 三联格式
3. 返回结构化 JSON：`{ recommendation_id, biz_date, type, evidence_metrics, message, action_steps, expected_impact, confidence }`
4. 写入 `Recommendation` 表，status="draft"

#### 6.1.2 智策卡审核

**文件：** `apps/web/src/app/api/v1/recommendations/[id]/approve/route.ts`

```
POST /api/v1/recommendations/{id}/approve
```

- 验证管理员身份（`isAdminRequest`）
- 更新 status="approved" + approvedBy + approvedAt
- 根据 `action_steps` 中的 `api_trigger_endpoint` 自动触发关联动作（如创建 task、发 notification、更新 scene promotion）

### 6.2 升级 report-generator

**文件：** `apps/web/src/lib/report-generator.ts`

在 `generateDailyReport` 末尾，追加智策卡生成调用：

```ts
// 生成智策卡（在日报生成之后）
void generateRecommendations(date).catch((error) =>
  console.error("Failed to generate recommendations:", error),
)
```

### 6.3 新建智策卡生成器

**文件：** `apps/web/src/lib/recommendation-generator.ts`

```ts
export async function generateRecommendations(date: string) {
  // 1. 获取日报数据（与 report-generator 共享数据获取）
  // 2. 调用 AI 生成结构化建议
  // 3. 写入 Recommendation 表
}
```

---

## 七、Phase A6 — 数据模型扩展 + 村民短信通道

### 7.1 OrchardTree hiddenGeo 填充

**文件：** `apps/web/src/lib/tree-geo.ts`

```ts
// 将 orachard_tree 的 lat/lng 转化为脱敏网格 ID
export function toGridId(lat: number, lng: number): string {
  // 将走马村区域划分为 100m×100m 网格
  const gridLat = Math.round(lat * 1000) % 100
  const gridLng = Math.round(lng * 1000) % 100
  return `网格_${gridLat}_${gridLng}`
}
```

在 `tree-adoptions` 和 `trees` API 返回中，对外暴露 `hiddenGeo` 而非 `lat/lng`。

### 7.2 村民短信通道（预留）

**文件：** `apps/web/src/lib/sms-provider.ts`

```ts
// 预留短信通道接口，当前回退为 in_app 通知
export async function sendSms(phone: string, content: string): Promise<boolean> {
  if (!process.env.SMS_API_KEY) {
    // 回退：创建一个 in_app 通知
    console.warn("SMS not configured, falling back to in_app notification")
    return false
  }
  // TODO: 接入阿里云短信/腾讯云短信
}
```

在 Notification 创建时，如果 `channel === "sms"`，调用 `sendSms()` 作为补充通道。

### 7.3 .env 新增变量

```
JWT_SECRET=zouma_dev_jwt_secret
REDIS_URL=redis://localhost:6379
SMS_API_KEY=
SMS_TEMPLATE_ID=
```

---

## 八、文件变更总清单

### 新建文件（22 个）

```
packages/database/src/redis.ts
apps/web/src/lib/adoption-lock.ts
apps/web/src/lib/auth-jwt.ts
apps/web/src/lib/auth-client.ts
apps/web/src/lib/history-data.ts
apps/web/src/lib/tree-geo.ts
apps/web/src/lib/sms-provider.ts
apps/web/src/lib/recommendation-generator.ts
apps/web/src/components/hero-screen.tsx
apps/web/src/components/history-scroll.tsx
apps/web/src/components/realm-map-gateway.tsx
apps/web/src/app/api/v1/auth/request-sms/route.ts
apps/web/src/app/api/v1/auth/verify-sms/route.ts
apps/web/src/app/api/v1/auth/me/route.ts
apps/web/src/app/api/v1/recommendations/route.ts
apps/web/src/app/api/v1/recommendations/[id]/approve/route.ts
```

### 修改文件（9 个）

```
packages/database/prisma/schema.prisma
packages/database/src/index.ts
infra/docker/docker-compose.dev.yml
apps/web/src/app/[locale]/page.tsx
apps/web/src/app/api/v1/tree-adoptions/route.ts
apps/web/src/lib/report-generator.ts
apps/web/src/components/notification-bell.tsx
apps/web/src/app/[locale]/trees/adoption-flow.tsx
.env.example + .env.local
```

### 修改 i18n（3 个）

```
apps/web/messages/zh-CN.json
apps/web/messages/en.json
apps/web/messages/ja.json
```

---

## 九、执行顺序

```
Step 1:  Phase A1  — Schema 修改 + migrate
Step 2:  Phase A2  — Redis 安装 + 客户端 + docker-compose
Step 3:  Phase A3  — jose 安装 + JWT lib + auth API（3 路由）
Step 4:  Phase A4  — history-data + 3 组件 + page.tsx 重构 + i18n
Step 5:  Phase A5  — Recommendation 生成器 + CRUD API + report-generator 钩子
Step 6:  Phase A6  — tree-geo + sms-provider + env 变量
Step 7:  Phase A7  — tree-environment-card + adoption-rights-panel + growth-animation + trees/[code] 升级
Step 8:  Phase A8  — admin dashboard 五模块重构 + 智策中心菜单
Step 9:  Phase A9  — 五流整合 + recommendation-generator 完善 + alert-engine 气象联动
Step 10: Phase A10 — device-heartbeat + report-generator 心跳集成 + 前端降级
Step 11: Phase A11 — acceptance-criteria.md 验收文档 + KPI 表格
```

**并行机会：** Step 3-4 可并行；Step 7-8 可并行；Step 9-10 可并行。

---

## 十、验证清单

- [ ] `npx prisma migrate deploy` 无报错
- [ ] Redis 容器启动 + `redis.ping()` 返回 PONG
- [ ] `POST /api/v1/auth/request-sms` → 创建 User → 返回验证码
- [ ] `POST /api/v1/auth/verify-sms` → 返回 JWT token
- [ ] `GET /api/v1/auth/me` → Authorization header → 返回用户信息
- [ ] 首页加载 → Hero 视频自动播放 → 滚动到历史长卷 → 地图网关可交互
- [ ] 认养流程 → Redis 锁获取成功 → 创建认养 → 锁释放
- [ ] 同时两个认养请求 → 第二个返回 409
- [ ] `POST /api/v1/recommendations/generate` → AI 生成智策卡 → status="draft"
- [ ] `POST /api/v1/recommendations/{id}/approve` → status="approved" → action_steps 触发
- [ ] 通知铃铛改用 JWT 鉴权后仍正常显示未读数
