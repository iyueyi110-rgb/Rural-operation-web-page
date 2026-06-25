# 走马村云脑系统 — API 接入状态清单

> **检查日期**: 2026-06-25
> **环境**: 开发环境 (localhost)
> **数据来源**: `.env.local` 配置 + 进程运行时环境 + 容器状态 + 源代码分析

---

## 一、基础设施（内部服务）

| 服务 | 状态 | 配置 | 连接 |
|------|------|------|------|
| **PostgreSQL 16** | ✅ 已接入 | `DATABASE_URL=postgresql://zouma:zouma_dev@localhost:5432/zouma` | Docker 运行中 (Up 3h, port 5432) |
| **Redis 7** | ✅ 已接入 | `REDIS_URL=redis://localhost:6379` | Docker 运行中 (Up 3h, port 6379) |

---

## 二、外部 API 接入状态

### 2.1 🤖 DeepSeek AI — ❌ 未接入

| 项目 | 值 |
|------|-----|
| **API Key** | `DEEPSEEK_API_KEY=` (空) |
| **Model** | `deepseek-chat` ✅ 已配置 |
| **代码位置** | `packages/utils/src/model-provider-adapter.ts` |

**影响功能**:
- AI 运营问答 (`/api/v1/ai/query`) — 调用时报错
- AI 内容生成 (`/api/v1/ai/generate-content`) — 报错
- 运营日报生成 (`/api/v1/cron/daily-report`) — AI 部分失败
- 智策卡生成 (`/api/v1/recommendations/generate`) — 失败
- 路线规划 AI 推荐 — 降级为静态路线
- 果树养护 AI 建议 — 不可用
- 客流预测 — 降级为规则计算

> ⚠️ **这是影响最大的缺失 API**，几乎全部 AI 功能不可用

**接入方式**: 在 `apps/web/.env.local` 中添加:
```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

---

### 2.2 🌤️ 和风天气 (QWeather) — ❌ 未接入

| 项目 | 值 |
|------|-----|
| **API Key** | `QWEATHER_API_KEY=` (空) |
| **Location ID** | `101040100` ✅ 已配置 |
| **API Host** | `https://nu4wcvrj9f.re.qweatherapi.com` ✅ 已配置 |
| **代码位置** | `apps/web/src/lib/weather.ts`, `weather-alerts.ts` |

**影响功能**:
- 实时天气数据 — 显示"天气服务待配置"
- 天气预警 — 返回空数组
- 雨天临水风险告警 — 无法触发
- 路线天气推荐 — 始终返回 sunny

> ⚠️ **有优雅降级**，不影响核心业务流程

**接入方式**: 在 `apps/web/.env.local` 中添加:
```
QWEATHER_API_KEY=xxxxxxxxxxxxxxxx
```

---

### 2.3 📱 短信服务 (SMS) — ❌ 未接入

| 项目 | 值 |
|------|-----|
| **API Key** | `SMS_API_KEY=` (空) |
| **Template ID** | `SMS_TEMPLATE_ID=` (空) |
| **Transport** | 未注入（`sendSms` 需要外部 `transport` 回调） |
| **代码位置** | `apps/web/src/lib/sms-provider.ts` |

**影响功能**:
- 村民任务通知短信 — fallback 到 in_app 通知
- 游客 OTP 验证码短信 — fallback 到 in_app 通知
- 告警通知短信 — fallback 到 in_app 通知

> ⚠️ **有优雅降级**，开发环境下 OTP 打印到控制台，应用内通知正常

**接入方式**: 在 `apps/web/.env.local` 中添加:
```
SMS_API_KEY=xxxxxxxxxxxxxxxx
SMS_TEMPLATE_ID=xxxxxxxxxxxxxxxx
```
并在调用 `sendSms` 时传入 `transport` 函数（当前代码中未实现 transport 注入）

---

### 2.4 🗺️ 高德地图 (AMap) — ❌ 未接入

| 项目 | 值 |
|------|-----|
| **Web JSAPI Key** | `NEXT_PUBLIC_AMAP_KEY=` (空) |
| **服务端 Key** | `AMAP_KEY=` (空) |
| **代码位置** | `apps/web/src/components/realm-map-gateway.tsx` |

**影响功能**:
- 四境游览地图 — 降级为 Leaflet/OpenStreetMap
- 地图标记与路线可视化 — Leaflet 替代方案可用

> ⚠️ **有 Leaflet fallback**，不影响核心功能，仅地图样式降级

**接入方式**: 在 `apps/web/.env.local` 中添加:
```
NEXT_PUBLIC_AMAP_KEY=xxxxxxxxxxxxxxxx
```

---

### 2.5 📡 传感器数据上报 (IoT) — ❌ 未接入

| 项目 | 值 |
|------|-----|
| **API Key** | `SENSOR_API_KEY=` (未在进程环境中) |
| **代码位置** | `apps/web/src/app/api/v1/devices/readings/route.ts` |

**影响功能**:
- IoT 设备数据上报 — 返回 401（`isDeviceReadingAuthorized` 失败）
- 传感器读数记录 — 无法写入
- 设备心跳检测 — 不影响（heartbeat 独立运行）

> ⚠️ 当前系统**没有线下 IoT 硬件**，此 API 为预留接口

**接入方式**: 在 `apps/web/.env.local` 中添加:
```
SENSOR_API_KEY=xxxxxxxxxxxxxxxx
```

---

## 三、安全凭证状态

| 凭证 | 状态 | 值 | 用途 |
|------|------|-----|------|
| **JWT_SECRET** | ✅ 已配置 | `zouma_dev_jwt_secret` | 游客 JWT 签名 |
| **ADMIN_API_TOKEN** | ❌ 进程缺失 | `zouma_dev_admin_token` (文件中有) | Admin API 鉴权 |
| **NEXT_PUBLIC_ADMIN_API_TOKEN** | ❌ 进程缺失 | `zouma_dev_admin_token` (文件中有) | Admin 前端发送鉴权 |
| **CRON_SECRET** | ❌ 空值 | `` (空) | 定时任务鉴权 |
| **CORS_ALLOWED_ORIGINS** | ❌ 未配置 | 未设置 (默认 localhost:3000,3001) | CORS 白名单 |

---

## 四、汇总

| 类别 | 总数 | 已接入 | 未接入 |
|------|------|--------|--------|
| 基础设施 | 2 | 2 | 0 |
| 外部 API | 5 | 0 | 5 |
| 安全凭证 | 5 | 1 | 4 |

### 按影响严重程度排序

| 优先级 | 缺失项 | 影响范围 | 是否有降级 |
|--------|--------|----------|------------|
| 🔴 P0 | `ADMIN_API_TOKEN` (进程缺失) | 全部 admin 功能不可用 | ❌ 无，直接 401 |
| 🔴 P0 | `DEEPSEEK_API_KEY` | 全部 AI 功能不可用 | ❌ 调用抛异常 |
| 🟡 P1 | `QWEATHER_API_KEY` | 天气数据缺失 | ✅ 有 fallback |
| 🟡 P1 | `CRON_SECRET` | 定时日报无法触发 | ✅ cron 手动调用 |
| 🟢 P2 | `SMS_API_KEY` | 短信通知不可用 | ✅ 降级 in_app |
| 🟢 P2 | `SENSOR_API_KEY` | IoT 数据无法上报 | ✅ 无硬件部署 |
| 🟢 P2 | `AMAP_KEY` | 地图降级为 Leaflet | ✅ Leaflet fallback |

### 当前可正常使用的功能

- ✅ 游客手机号登录/注册（JWT）
- ✅ 空间节点查询
- ✅ 树木认养、养护日志
- ✅ 村民管理（查询，保存需先修复 ADMIN_API_TOKEN）
- ✅ 任务分配与管理
- ✅ 活动预约、院落预订
- ✅ 商品与订单
- ✅ 客流数据记录
- ✅ 告警规则引擎（不含天气相关）
- ✅ IoT 设备管理（不含数据上报）
- ✅ 通知（in_app 渠道）
- ✅ 反馈工单
- ✅ 农事日历
