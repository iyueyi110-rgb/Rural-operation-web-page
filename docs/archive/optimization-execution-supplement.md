# 走马村系统优化 — 补充执行指令 (Phase A7-A11)

> **接续文档：** `docs/optimization-execution.md`（Phase A1-A6）
> **新增原因：** 覆盖优化方案中需求 (1)(2)(4)(5)(6)(7)

---

## Phase A7 — 认养一棵树体验升级 [Req 4]

参考优化方案 Image 2（树木档案选择/全景旋转/环境抽屉）、Image 3（成长timeline/WebAR动画）、Image 5（荔田共生空间门户）。

### A7.1 修改树详情页

**文件：** `apps/web/src/app/[locale]/trees/[code]/page.tsx`

在现有养护日志时间线和 InteractionPanel 之间插入：

1. **实时环境指标卡片** — 土壤水分/空气湿度/光照强度三指标，调用 `GET /api/v1/infrastructure/sensors/latest?nodeId=xxx`。无 LoRa 数据时降级为"当季历史气候基准值"
2. **权益面板** — 认养后展示四项动态权益（最低产量保障/实地采摘预约权/专属树牌定制/冷链包邮），数据源 `TreeAdoption.rightsJson`
3. **生长 Timeline 升级** — 从静态列表改为横滑交互式（`overflow-x: auto`），节点点击触发 CSS `@keyframes` 生长动画

### A7.2 新建组件（3 个）

**文件：** `apps/web/src/components/tree-environment-card.tsx`
- `"use client"`，Props: `{ treeId: string }`
- 调用 `GET /api/v1/infrastructure/sensors/latest?nodeId=...`
- 💧土壤水分 / 🌡️空气湿度 / ☀️光照强度，各带进度条+数值+单位
- 设备 status="warning" 时显示黄色"传感断线"标签 + 历史基准值
- 设备 status="inactive" 时灰显 + "设备维护中"

**文件：** `apps/web/src/components/adoption-rights-panel.tsx`
- Props: `{ rightsJson, plan, status }`
- 四项权益卡片：采摘额度 / 实地预约 / 专属树牌 / 冷链配送
- status="active" 时高亮 + check 图标
- status="pending_payment" 时灰显 + "支付后解锁"提示

**文件：** `apps/web/src/components/growth-animation.tsx`
- Props: `{ stage: "flowering" | "fruiting" | "ripening" | "harvest" }`
- 纯 CSS 动画，不依赖 WebAR
- 由 Timeline 节点点击触发，动画完成后回调

---

## Phase A8 — 云脑后台极简重构 [Req 5]

参考优化方案 Image 4：深色系科技感仪表盘。

### A8.1 重构 admin dashboard

**文件：** `apps/admin/src/app/dashboard/page.tsx`

当前已有 4 个统计卡片。重构为五模块极简布局：

| 模块 | 数据源 | 刷新 |
|---|---|---|
| 村民生产数据 | `GET /villagers` + `GET /tasks?status=completed` | 1h |
| 游客行为分析 | `GET /analytics/consumption/by-node` + `GET /presence/series` | 实时 |
| 生态感知面板 | `GET /infrastructure/sensors/latest` + `GET /alerts?status=active` | 30s |
| 农产品反馈 | `GET /feedback` + `GET /products` | 1h |
| 运营智策卡 | `GET /recommendations?status=draft` | 每日 |

每个模块用统一的深色卡片组件渲染。

### A8.2 新建组件（3 个，admin 侧）

**文件：** `apps/admin/src/components/dashboard-module-card.tsx`
- Props: `{ title, icon, loading, onRefresh, children }`
- 深灰背景 + 翠绿趋势曲线 + 亮橙告警灯，扁平无边框风格

**文件：** `apps/admin/src/components/recommendation-review-panel.tsx`
- 展示 draft 智策卡，Evidence + Action + Impact 三联格式
- "审核通过"按钮 → `POST /api/v1/recommendations/{id}/approve`
- "驳回"按钮 → status="rejected"

**文件：** `apps/admin/src/components/active-alerts-panel.tsx`
- 从现有 `apps/admin/src/app/alerts/page.tsx` 中提取为内嵌面板
- 高严重度告警用红闪 CSS 动画（`@keyframes alertBlink`）
- "派单"按钮 → `PATCH /alerts` + `POST /tasks`

### A8.3 admin 新增菜单项

在 admin sidebar 中追加"智策中心"入口，路由 `/admin/recommendations`，展示智策卡列表（draft/approved/executed 三状态 Tab）。

---

## Phase A9 — 多源数据流整合 [Req 6]

### A9.1 五大数据流定义

| 流ID | 数据流名称 | 现有数据源 | 整合动作 |
|---|---|---|---|
| F1 | 村民生产 | `Villager` + `Task` + `FarmingCalendar` | 接入 `generateRecommendations()` |
| F2 | 游客行为 | `PresenceLog` + `UnifiedOrder` + `RouteGenerationLog` + `VisitorInteractionTask` | 接入 `generateRecommendations()` |
| F3 | 生态感知 | `SensorReading` + `Alert` + 和风天气 | 接入智策卡 + 实时面板(A8) |
| F4 | 农产品反馈 | `FeedbackTicket` + `Product` + `UnifiedOrder` | 接入 `generateRecommendations()` |
| F5 | 运营智策 | `Recommendation` + `DailyReport` | 闭环反馈到 F1-F4 |

### A9.2 决策引擎核心逻辑

**文件：** `apps/web/src/lib/recommendation-generator.ts`

```
generateRecommendations(date):
  1. parallel fetch F1+F2+F3+F4
  2. check dedup (已有 date 的 draft/approved 则 skip)
  3. assemble context JSON
  4. ModelProviderAdapter.complete() with RECOMMENDATION_PROMPT
  5. parse → prisma.recommendation.create()
```

### A9.3 气象预警联动

**修改文件：** `apps/web/src/lib/alert-engine.ts`

在 `runAlertChecks` 中，天气预警触发后追加：

```ts
if (weatherAlerts.length > 0) {
  void generateWeatherRecommendations(date, weatherAlerts).catch(
    (e) => console.error("Weather recommendation failed:", e)
  )
}
```

---

## Phase A10 — IoT 设备健康自检 [Req 1]

### A10.1 心跳自检机制

**新建文件：** `apps/web/src/lib/device-heartbeat.ts`

```ts
import { prisma } from "@zouma/database"

const OFFLINE_THRESHOLD_MS = 90 * 60 * 1000  // 1.5 hours

export async function runDeviceHeartbeatCheck() {
  const threshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS)
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const offlineDevices = await prisma.device.findMany({
    where: {
      status: "active",
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: threshold } }],
    },
  })

  for (const device of offlineDevices) {
    // 自带去重：当天同设备只创建一次告警
    const existingAlert = await prisma.alert.findFirst({
      where: { alertType: "device_offline", nodeId: device.nodeId ?? null, status: "active", createdAt: { gte: dayStart } },
      select: { id: true },
    })
    if (!existingAlert) {
      await prisma.alert.create({
        data: {
          alertType: "device_offline",
          nodeId: device.nodeId ?? null,
          severity: "medium",
          message: `${device.name} (${device.deviceId}) offline for >1.5 hours.`,
          status: "active",
        },
      })
    }
    await prisma.device.update({
      where: { id: device.id },
      data: { status: "warning" },
    })
  }
}
```

### A10.2 集成到日报管线

**修改文件：** `apps/web/src/lib/report-generator.ts`

> ⚠️ 此文件同时被 A5（智策卡钩子，在函数末尾追加）和 A10（心跳自检，在并行数据获取中追加）修改。**执行时必须两个修改点都命中**——先在并行数据获取数组中追加 `runDeviceHeartbeatCheck()`，再在函数末尾追加 `generateRecommendations()`。

在 `generateDailyReport` 的并行数据获取 `Promise.all` 数组中追加一项：

```ts
const [presenceAgg, orderAgg, feedbackAgg, nodeScores, weather, offlineDevices, productRanking, completedTasks, trafficForecast, _heartbeat] = await Promise.all([
  // ... existing fetches (9 items)
  runDeviceHeartbeatCheck().catch((e) => console.error("Heartbeat check failed:", e)),
])
```

### A10.3 前端降级三级策略

```
sensor online  → 实时环境指标（进度条 + 数值）
sensor warning → 黄色"传感断线"标签 + 历史气候基准值
sensor offline → 灰色禁用态 + "设备维护中，数据暂不可用"
```

---

## Phase A11 — 系统测试与验收标准 [Req 7]

### A11.1 核心 KPI

| KPI | 目标 | 检测方式 |
|---|---|---|
| 认养转化率 | 树档案→认养发起 >= 8% | analytics API |
| 反馈处理时效 | 中位数 < 4h | FeedbackTicket status 流转时间差 |
| 日报准点率 | 每日 09:00 前 >= 95% | DailyReport.generatedAt vs 09:00 |
| 告警响应速度 | 高严重度 30min 内响应 >= 90% | Alert active→acknowledged 时间差 |
| 智策卡采纳率 | approved/total >= 60% | Recommendation status 转化漏斗 |
| IoT 断线检测延迟 | < 2h | device-heartbeat 执行时间戳 vs lastSeenAt |

### A11.2 测试场景

| # | 场景 | 验收标准 |
|---|---|---|
| 1 | 游客认养全链路 | 锁冲突 409 可复现；认养成功后证书+互动任务 auto generate |
| 2 | 村民任务流转 | pending→accepted→in_progress→completed 正确流转；照片上传+收益更新 |
| 3 | 日报生成 | 7 板块填充完整；action items >= 3；notification created |
| 4 | 告警→智策卡联动 | alert 5s 内创建；weather_plan 智策卡 30s 内生成 draft |
| 5 | IoT 断线降级 | device.status→warning；前端环境卡片切换为历史基准值 |
| 6 | 并发认养冲突 | Redis 锁：一个 201，一个 409；DB version 递增；无重复认养记录 |
| 7 | 首页三阶流线 | 视频自动播放；滚动进入历史长卷；地图 polygon 可点击跳转 |
| 8 | JWT 认证 | login-sms→token→me；过期 token 返回 401；通知铃铛用 userId 正常查询 |

### A11.3 输出验收文档

**新建文件：** `docs/acceptance-criteria.md`

将以上 KPI 表格和测试场景整理为独立验收文档，每项包含：场景描述、操作步骤、预期结果、数据验证 SQL/API。

---

## 补充文件清单

| Phase | 新建文件 |
|---|---|
| A7 | `apps/web/src/components/tree-environment-card.tsx` |
| A7 | `apps/web/src/components/adoption-rights-panel.tsx` |
| A7 | `apps/web/src/components/growth-animation.tsx` |
| A8 | `apps/admin/src/components/dashboard-module-card.tsx` |
| A8 | `apps/admin/src/components/recommendation-review-panel.tsx` |
| A8 | `apps/admin/src/components/active-alerts-panel.tsx` |
| A10 | `apps/web/src/lib/device-heartbeat.ts` |
| A11 | `docs/acceptance-criteria.md` |

| Phase | 修改文件 |
|---|---|
| A7 | `apps/web/src/app/[locale]/trees/[code]/page.tsx` |
| A8 | `apps/admin/src/app/dashboard/page.tsx` |
| A9 | `apps/web/src/lib/alert-engine.ts` |
| A9 | `apps/web/src/lib/recommendation-generator.ts` |
| A10 | `apps/web/src/lib/report-generator.ts` |
