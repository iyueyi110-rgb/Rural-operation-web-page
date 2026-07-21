# 走马村云脑系统 — API 与物理设备接入审查 & 降级执行指令

> **审查日期**：2026-06-30  
> **审查范围**：62 个 API 路由 + 6 个外部服务依赖 + 36 个数据模型  
> **目标**：确保系统在零外部 API Key 条件下可完整演示全部业务流程  
> **总预计工时**：约 60 分钟（含验证）

---

## 目录

1. [所需 API Key 清单](#〇所需-api-key-清单)
2. [系统整体状态](#一系统整体状态)
3. [步骤一：天气服务降级（P0，15 分钟）](#步骤一天气服务降级p015-分钟)
4. [步骤二：AI Fallback 内容升级（P0，15 分钟）](#步骤二ai-fallback-内容升级p015-分钟)
5. [步骤三：统一演示模式与健康检查（P1，20 分钟）](#步骤三统一演示模式与健康检查p120-分钟)
6. [步骤四：构建验证与业务闭环测试（10 分钟）](#步骤四构建验证与业务闭环测试10-分钟)
7. [附录 A：已完善降级（无需处理）](#附录-a已完善降级无需处理)
8. [附录 B：完整 API 路由清单](#附录-b完整-api-路由清单)
9. [附录 C：验收标准](#附录-c验收标准)

---

## 〇、所需 API Key 清单

系统依赖 **7 个外部服务**，按演示必要性分为三档。完整列表如下：

### 🔴 演示前必须降级（无 Key 时演示效果受损）

| #   | 环境变量           | 服务               | 申请地址                                               | 缺失时的现象                                  | 降级方案                                     |
| --- | ------------------ | ------------------ | ------------------------------------------------------ | --------------------------------------------- | -------------------------------------------- |
| 1   | `DEEPSEEK_API_KEY` | DeepSeek AI 大模型 | [platform.deepseek.com](https://platform.deepseek.com) | 路线生成返回空、AI 问答无内容、内容工厂无输出 | **步骤二**：升级 fallback 为完整预设内容     |
| 2   | `QWEATHER_API_KEY` | 和风天气 API       | [dev.qweather.com](https://dev.qweather.com)           | 首页天气显示 "--℃ 天气服务待配置"             | **步骤一**：替换为走马村当季典型气候模拟数据 |

### 🟡 演示模式可用（已有降级，但建议知晓）

| #   | 环境变量                            | 服务                      | 申请地址                                     | 缺失时的行为                                                |
| --- | ----------------------------------- | ------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| 3   | `SMS_API_KEY` + `SMS_TEMPLATE_ID`   | 短信网关（阿里云/腾讯云） | 各云厂商控制台                               | 验证码在控制台打印（村民端固定 `888888`），通知退化为站内信 |
| 4   | `SENSOR_API_KEY`                    | IoT 传感器网关            | N/A（需硬件部署）                            | 设备读数进入 demo 模式，自动创建模拟设备，告警仍可手动触发  |
| 5   | `AMAP_KEY` / `NEXT_PUBLIC_AMAP_KEY` | 高德地图 JSAPI            | [console.amap.com](https://console.amap.com) | 地图自动降级为 Leaflet + ArcGIS 卫星图，功能不受影响        |
| 6   | `REDIS_URL`                         | Redis 缓存                | N/A（本地 `redis://localhost:6379`）         | 分布式锁自动降级为数据库行级锁，并发认养仍安全              |

### 🟢 演示环境下无需关注

| #   | 环境变量              | 说明                                                                                                                            |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 7   | 微信支付 / 支付宝商户 | 需营业执照 + 对公账户，演示阶段不可能接入。系统以 `mock_demo` 模式运行，支付流程完整（下单→确认→状态变更→订单联动），点击即完成 |

### 非外部服务的必填变量

| 环境变量                          | 用途                              | 演示环境建议值                                      |
| --------------------------------- | --------------------------------- | --------------------------------------------------- |
| `DATABASE_URL`                    | PostgreSQL 连接                   | `postgresql://zouma:zouma_dev@localhost:5432/zouma` |
| `JWT_SECRET`                      | 用户认证签名                      | `zouma_dev_jwt_secret`                              |
| `CRON_SECRET`                     | 日报定时任务鉴权                  | 任意随机字符串                                      |
| `ADMIN_API_TOKEN`                 | Admin BFF 到 Web API 的服务端鉴权 | 随机字符串，仅服务端配置                            |
| `ADMIN_LOGIN_PASSWORD`            | 管理员登录口令                    | 与 API token 不同的独立口令                         |
| `ADMIN_SESSION_SECRET`            | HttpOnly 管理员会话签名           | 至少 32 字符的独立随机值                            |
| `WEB_API_BASE`                    | Admin BFF 上游地址                | `http://localhost:3000/api/v1`                      |
| `NEXT_PUBLIC_SITE_URL`            | 站点 URL                          | `http://localhost:3000`                             |
| `NEXT_PUBLIC_WEB_API_BASE`        | API 基地址                        | `http://localhost:3000/api/v1`                      |
| `NEXT_PUBLIC_HOME_HERO_VIDEO_URL` | 首页 Hero 视频（可选）            | 留空则使用静态图片                                  |
| `CORS_ALLOWED_ORIGINS`            | CORS 白名单                       | `http://localhost:3000,http://localhost:3001`       |

### 最小可运行 .env.local

```bash
# 数据库（必须）
DATABASE_URL=postgresql://zouma:zouma_dev@localhost:5432/zouma

# 安全（必须）
JWT_SECRET=zouma_dev_jwt_secret
CRON_SECRET=demo_cron_secret_2026
ADMIN_API_TOKEN=demo_admin_token_2026
ADMIN_LOGIN_PASSWORD=demo_admin_login_password_2026
ADMIN_SESSION_SECRET=demo_admin_session_secret_2026_minimum_32_chars
WEB_API_BASE=http://localhost:3000/api/v1

# 站点（必须）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WEB_API_BASE=http://localhost:3000/api/v1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# 以下全部留空即可运行全演示模式
# DEEPSEEK_API_KEY=
# QWEATHER_API_KEY=
# SMS_API_KEY=
# SMS_TEMPLATE_ID=
# SENSOR_API_KEY=
# REDIS_URL=
# AMAP_KEY=
# NEXT_PUBLIC_AMAP_KEY=
```

---

## 一、系统整体状态

| 层级                         | 状态         | 说明                                      |
| ---------------------------- | ------------ | ----------------------------------------- |
| 数据库 (PostgreSQL + Prisma) | ✅ 完全可用  | 36 个模型，本地 PostgreSQL 即可           |
| 前端页面 (前台 15 + 后台 21) | ✅ 完全可用  | 静态内容页（四境）均可离线渲染            |
| 后端 API (62 个路由)         | ✅ 60 个完整 | 所有 CRUD 闭环完整                        |
| AI 服务 (DeepSeek)           | ⚠️ 需降级    | fallback 内容过于简短（4句共 ~120 字）    |
| 天气服务 (和风天气)          | ⚠️ 需降级    | fallback 显示 "天气服务待配置"            |
| 高德地图                     | ✅ 已有降级  | 无 Key 时自动切换 Leaflet + ArcGIS 卫星图 |
| 短信网关                     | ✅ 已有降级  | 村民端返回 `888888`                       |
| 支付网关 (微信/支付宝)       | ✅ 演示模式  | 始终 `mock_demo`，点击即完成              |
| IoT 传感器                   | ✅ 已有降级  | 演示模式自动创建设备                      |
| Redis                        | ✅ 已有降级  | 分布式锁自动 DB fallback                  |

| 层级                         | 状态         | 说明                                   |
| ---------------------------- | ------------ | -------------------------------------- |
| 数据库 (PostgreSQL + Prisma) | ✅ 完全可用  | 36 个模型，本地 PostgreSQL 即可        |
| 前端页面 (前台 15 + 后台 21) | ✅ 完全可用  | 静态内容页（四境）均可离线渲染         |
| 后端 API (62 个路由)         | ✅ 60 个完整 | 所有 CRUD 闭环完整                     |
| AI 服务 (DeepSeek)           | ⚠️ 需降级    | fallback 内容过于简短（4句共 ~120 字） |
| 天气服务 (和风天气)          | ⚠️ 需降级    | fallback 显示 "天气服务待配置"         |
| 短信网关                     | ✅ 已有降级  | 村民端返回 `888888`                    |
| 支付网关 (微信/支付宝)       | ✅ 演示模式  | 始终 `mock_demo`，点击即完成           |
| IoT 传感器                   | ✅ 已有降级  | 演示模式自动创建设备                   |
| Redis                        | ✅ 已有降级  | 分布式锁自动 DB fallback               |

---

## 步骤一：天气服务降级（P0，15 分钟）

### 问题

未配置 `QWEATHER_API_KEY` 时，首页 Hero 区域显示：

> `--℃`  
> `天气服务待配置：请设置 QWEATHER_API_KEY 后通过 /api/v1/weather 代理读取实时天气。`

这是系统配置提示语，不是面向用户的内容，**严重影响演示效果**。

### 涉及文件

| 文件                                       | 当前行为                                         |
| ------------------------------------------ | ------------------------------------------------ |
| `apps/web/src/app/api/v1/weather/route.ts` | 无 key 时返回 `source: "configuration-required"` |
| `apps/web/src/lib/weather.ts`              | `getWeatherSummary()` 透传配置提示到首页         |
| `apps/web/src/components/hero-screen.tsx`  | 消费 `weather` prop（**不修改此文件**）          |

---

### 1.1 修改 `apps/web/src/app/api/v1/weather/route.ts`

**操作**：将 `fallbackWeather` 从配置提示改为走马村当季典型气候模拟数据。

**当前代码**（第 3-9 行）：

```ts
const fallbackWeather = {
  data: {
    temperature: "--℃",
    summary:
      "天气服务待配置：请设置 QWEATHER_API_KEY 后通过 /api/v1/weather 代理读取实时天气。",
    source: "configuration-required",
    updatedAt: new Date().toISOString(),
  },
}
```

**替换为**：

```ts
function getDemoWeatherData() {
  const now = new Date()
  const hour = now.getHours()
  const month = now.getMonth() + 1
  const isSummer = month >= 6 && month <= 9
  const isWinter = month === 12 || month <= 2

  let temp: string, text: string
  if (isSummer) {
    temp = hour < 10 ? "26" : hour < 15 ? "32" : "28"
    text = "多云"
  } else if (isWinter) {
    temp = hour < 10 ? "8" : hour < 15 ? "14" : "10"
    text = "阴"
  } else {
    temp = hour < 10 ? "16" : hour < 15 ? "22" : "18"
    text = "晴"
  }

  return {
    data: {
      temperature: `${temp}℃`,
      summary: `走马村今日天气（演示数据）：${text}，气温${temp}℃。${
        isSummer
          ? "午后可能有短暂阵雨，建议清晨或傍晚出行，备好防晒与饮用水。"
          : isWinter
            ? "山区体感偏冷，建议穿着保暖外套，古道区域路面可能湿滑。"
            : "气温宜人，适合户外活动，是游览四境的最佳时节。"
      }`,
      source: "seasonal-baseline",
      updatedAt: now.toISOString(),
    },
  }
}
```

同时将函数体内两处 `return jsonResponse(request, fallbackWeather)` 改为 `return jsonResponse(request, getDemoWeatherData())`。

**约束**：

- 不引入新的外部依赖
- 不修改接口返回结构（仍是 `{ data: WeatherSummary }`）
- `source: "seasonal-baseline"` 用于与真实天气 `"qweather"` 区分

---

### 1.2 修改 `apps/web/src/lib/weather.ts`

**操作**：在 `getWeatherSummary()` 中检测到 `source === "configuration-required"` 时返回演示数据。

**当前代码**（第 12-29 行）：

```ts
export async function getWeatherSummary(): Promise<WeatherSummary> {
  const fallback: WeatherSummary = {
    temperature: "--℃",
    summary: "天气服务待配置：请设置 QWEATHER_API_KEY ...",
    source: "configuration-required",
    updatedAt: new Date().toISOString(),
  }
  // ... fetch 逻辑 ...
}
```

**替换思路**：

1. 将 `fallback` 替换为调用 `getDemoWeather()` 本地函数（内容与步骤 1.1 中的 `getDemoWeatherData()` 逻辑一致）
2. 在 fetch 成功后检查 `payload.data?.source === "configuration-required"`，若是则返回 demo 数据
3. `getWeatherCondition()` 无需修改（它已经基于温度/雨/热做判断）

**约束**：

- 不修改 `WeatherSummary` 接口
- 不修改 `getWeatherCondition()` 签名和行为
- 不修改 `hero-screen.tsx`

---

### 1.3 验证天气降级

```bash
# 确保未设置 QWEATHER_API_KEY
unset QWEATHER_API_KEY

# 启动系统
pnpm dev

# 访问首页，确认 Hero 区域天气显示具体温度和出行建议
curl -s http://localhost:3000/api/v1/weather | jq '.data'
# 预期: { temperature: "32℃", summary: "走马村今日天气（演示数据）：多云...", source: "seasonal-baseline" }
```

---

## 步骤二：AI Fallback 内容升级（P0，15 分钟）

### 问题

未配置 `DEEPSEEK_API_KEY` 时，AI fallback 返回极短提示语：

| fallback 类型     | 当前内容                                                      | 字数 |
| ----------------- | ------------------------------------------------------------- | ---- |
| `route`           | "AI 路线服务暂时不可用，已按路线模板为你保留可解释路线建议。" | 26   |
| `content_factory` | "AI 内容工厂暂时不可用，已显示审核过的预设内容方向。"         | 24   |
| `ai_query`        | "AI 问答暂时不可用，已显示走马村云脑的预设运营说明。"         | 24   |
| `recommendation`  | "AI 智策生成暂时不可用，请先查看规则层和现场数据建议。"       | 26   |

这些短句对演示场景**没有实质内容价值**。

### 涉及文件

| 文件                                                   | 需要修改                                       |
| ------------------------------------------------------ | ---------------------------------------------- |
| `packages/prompts/fallback-responses.ts`               | ✅ 升级 4 条 fallback 内容                     |
| `apps/web/src/lib/ai-query.ts`                         | ✅ fallback 改为调用 `getFallbackResponse()`   |
| `apps/web/src/app/api/v1/ai/query/route.ts`            | ❌ 无需修改（已有 try/catch）                  |
| `apps/web/src/app/api/v1/ai/generate-content/route.ts` | ❌ 无需修改（已有 try/catch）                  |
| `apps/web/src/app/api/v1/routes/generate/route.ts`     | ❌ 无需修改（已有 `selectRouteOption()` 降级） |

---

### 2.1 修改 `packages/prompts/fallback-responses.ts`

**操作**：将 4 条简短提示升级为有演示价值的完整预设内容。

**当前代码**（第 6-11 行）：

```ts
const fallbackResponses: Record<string, string> = {
  route: "AI 路线服务暂时不可用，已按路线模板为你保留可解释路线建议。",
  content_factory: "AI 内容工厂暂时不可用，已显示审核过的预设内容方向。",
  ai_query: "AI 问答暂时不可用，已显示走马村云脑的预设运营说明。",
  recommendation: "AI 智策生成暂时不可用，请先查看规则层和现场数据建议。",
}
```

**替换为**：

```ts
const fallbackResponses: Record<string, string> = {
  route:
    "🎯 为你推荐「古道慢行·半日游」路线：" +
    "从溪口驿站出发 → 灵王茶室品茗 → 走马文化中心参观 → 综合服务中心休整。" +
    "全程约 3.5 小时，步行强度低，适合各年龄段。" +
    "雨天备选方案：改为室内文化体验路线（茶室 + 文化中心 + 服务中心手作课堂）。" +
    "（本条路线由系统模板生成，AI 服务就绪后可获得更个性化推荐）",

  content_factory:
    "【走马村四境导览词 — 古道叙事境】\n\n" +
    "在重庆长寿区走马村的群山之间，一条百年古道如同时光的书签，" +
    "静静标记着川渝驿道的往昔。踏上青石板路，两侧荔枝林沙沙作响，" +
    "仿佛还能听见马帮铃声。\n\n" +
    "前方是灵王庙遗址，村民世代守护的茶室就藏在古榕树下——" +
    "一壶老荫茶，一段古驿故事，是走马村最质朴的待客之道。" +
    "（本条内容由系统模板生成，AI 内容工厂就绪后可获得更丰富的导览素材）",

  ai_query:
    "走马村云脑系统当前运营概况（演示数据）：\n\n" +
    "• 今日预计客流：180–220 人次（基于近 14 天趋势估算）\n" +
    "• 热门节点：荔田共生境（采摘体验）、古道叙事境（文化导览）\n" +
    "• 在售院落：岭上共居境 3 间民宿可订\n" +
    "• 可认养荔枝树：妃子笑 12 棵、桂味 8 棵\n" +
    "• 活跃告警：0 条\n\n" +
    "（AI 问答服务就绪后，可进行自然语言数据查询）",

  recommendation:
    "📋 今日运营建议（规则引擎生成）：\n\n" +
    "1. 【客流引导】午后气温较高，建议引导游客优先游览室内节点（文化中心、手作工坊）\n" +
    "2. 【采摘管理】荔田共生境采摘预约已达 70%，建议开启分时段管控\n" +
    "3. 【安全提醒】韧谷研学境近水区域需加强巡查，确认警示标识完好\n" +
    "（AI 智策服务就绪后，可结合多维度数据生成更精准的运营建议）",
}
```

**约束**：

- 不修改 `FallbackResponse` 接口
- 不修改 `getFallbackResponse()` 函数签名
- 每条末尾注明 "系统模板生成" 以区别于 AI 生成
- 不编造具体价格、联系方式、安全承诺

---

### 2.2 修改 `apps/web/src/lib/ai-query.ts`

**操作**：`answerOperationalQuestion()` 的独立 fallback 改为统一调用 `getFallbackResponse("ai_query")`。

**当前代码**（catch 块内）：

```ts
  } catch (error) {
    console.error("AI operational query failed:", error)
    return "AI 助手暂时不可用，请稍后重试。"
  }
```

**替换为**：

```ts
  } catch (error) {
    console.error("AI operational query failed:", error)
    const { getFallbackResponse } = await import("@zouma/prompts/fallback-responses")
    return getFallbackResponse("ai_query").content
  }
```

或直接在文件顶部已有 import 的情况下简化为：

```ts
import { getFallbackResponse } from "@zouma/prompts/fallback-responses"
// ...
  } catch (error) {
    console.error("AI operational query failed:", error)
    return getFallbackResponse("ai_query").content
  }
```

---

### 2.3 验证 AI Fallback

```bash
# 确保未设置 DEEPSEEK_API_KEY
unset DEEPSEEK_API_KEY

# 确认已有单元测试仍然通过
pnpm --filter @zouma/prompts test

# 测试 AI 问答（需 admin token）
curl -s -X POST http://localhost:3000/api/v1/ai/query \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: ${ADMIN_API_TOKEN}" \
  -d '{"question":"今天客流多少"}' | jq '.data.answer'

# 预期：返回包含 "180–220 人次"、"荔田共生境" 等具体内容的运营摘要

# 测试内容工厂
curl -s -X POST http://localhost:3000/api/v1/ai/generate-content \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: ${ADMIN_API_TOKEN}" \
  -d '{"type":"narration"}' | jq '.data.content'

# 预期：返回 150 字以上的导览词，以 "【走马村四境导览词" 开头
```

---

## 步骤三：统一演示模式与健康检查（P1，20 分钟）

### 目标

创建集中式演示模式管理和健康检查 API，让前端和运维可统一判断系统运行状态。

### 新建文件

| 文件                                             | 作用                 |
| ------------------------------------------------ | -------------------- |
| `apps/web/src/lib/demo-mode.ts`                  | 演示模式配置中心     |
| `apps/web/src/lib/system-health.ts`              | 6 项外部服务健康检查 |
| `apps/web/src/app/api/v1/system/health/route.ts` | 健康检查 API 端点    |

---

### 3.1 新建 `apps/web/src/lib/demo-mode.ts`

```ts
import "server-only"

export interface DemoModeConfig {
  aiAvailable: boolean
  weatherAvailable: boolean
  smsAvailable: boolean
  paymentAvailable: boolean
  iotAvailable: boolean
  isFullDemo: boolean
}

export function getDemoModeConfig(): DemoModeConfig {
  const aiAvailable = Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  const weatherAvailable = Boolean(process.env.QWEATHER_API_KEY?.trim())
  const smsAvailable =
    Boolean(process.env.SMS_API_KEY?.trim()) &&
    Boolean(process.env.SMS_TEMPLATE_ID?.trim())
  const paymentAvailable = false // 微信/支付宝尚未接入
  const iotAvailable = Boolean(process.env.SENSOR_API_KEY?.trim())

  const isFullDemo =
    !aiAvailable &&
    !weatherAvailable &&
    !smsAvailable &&
    !paymentAvailable &&
    !iotAvailable

  return {
    aiAvailable,
    weatherAvailable,
    smsAvailable,
    paymentAvailable,
    iotAvailable,
    isFullDemo,
  }
}

export function getDemoModeLabel(): string | null {
  const config = getDemoModeConfig()
  if (config.isFullDemo) return "全演示模式"
  if (!config.aiAvailable && !config.weatherAvailable) return "部分演示模式"
  if (!config.aiAvailable) return "AI 演示模式"
  return null
}
```

---

### 3.2 新建 `apps/web/src/lib/system-health.ts`

```ts
import "server-only"

export interface ServiceHealth {
  name: string
  available: boolean
  mode: "live" | "demo" | "unavailable"
  message: string
}

export interface SystemHealthReport {
  timestamp: string
  services: ServiceHealth[]
  overallMode: "live" | "demo"
  summary: string
}

function checkAi(): ServiceHealth {
  const ok = Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  return {
    name: "AI 模型 (DeepSeek)",
    available: ok,
    mode: ok ? "live" : "demo",
    message: ok
      ? "DeepSeek API 已连接"
      : "未配置 DEEPSEEK_API_KEY，AI 功能使用预设模板替代，不影响演示流程",
  }
}

function checkWeather(): ServiceHealth {
  const ok = Boolean(process.env.QWEATHER_API_KEY?.trim())
  return {
    name: "天气服务 (和风天气)",
    available: ok,
    mode: ok ? "live" : "demo",
    message: ok
      ? "和风天气 API 已连接"
      : "未配置 QWEATHER_API_KEY，天气显示走马村当季典型气候（演示用）",
  }
}

function checkSms(): ServiceHealth {
  const ok =
    Boolean(process.env.SMS_API_KEY?.trim()) &&
    Boolean(process.env.SMS_TEMPLATE_ID?.trim())
  return {
    name: "短信服务",
    available: ok,
    mode: ok ? "live" : "demo",
    message: ok
      ? "短信网关已配置"
      : "短信网关未配置，验证码在控制台明文返回，通知退化为站内消息",
  }
}

function checkPayment(): ServiceHealth {
  return {
    name: "支付网关 (微信/支付宝)",
    available: false,
    mode: "demo",
    message: "微信支付与支付宝尚未接入，支付使用演示模式——点击确认即完成订单",
  }
}

function checkIoT(): ServiceHealth {
  const ok = Boolean(process.env.SENSOR_API_KEY?.trim())
  return {
    name: "IoT 传感器网关",
    available: ok,
    mode: ok ? "live" : "demo",
    message: ok
      ? "IoT 传感器网关已连接"
      : "IoT 传感器尚未部署，设备数据使用模拟样本，告警阈值仍可触发演示",
  }
}

function checkRedis(): ServiceHealth {
  const ok = Boolean(process.env.REDIS_URL?.trim())
  return {
    name: "Redis 缓存",
    available: ok,
    mode: ok ? "live" : "demo",
    message: ok
      ? "Redis 已连接"
      : "未配置 REDIS_URL，分布式锁退化为数据库级锁，功能不受影响",
  }
}

export function getSystemHealthReport(): SystemHealthReport {
  const services = [
    checkAi(),
    checkWeather(),
    checkSms(),
    checkPayment(),
    checkIoT(),
    checkRedis(),
  ]

  const allLive = services.every((s) => s.mode === "live")
  const anyLive = services.some((s) => s.mode === "live")

  return {
    timestamp: new Date().toISOString(),
    services,
    overallMode: allLive ? "live" : "demo",
    summary: allLive
      ? "所有外部服务已连接，系统全功能运行"
      : anyLive
        ? `部分外部服务已连接 (${services.filter((s) => s.mode === "live").length}/${services.length})；未连接服务已启用降级演示模式`
        : "外部服务均未配置，系统运行于全演示模式——所有业务流程可使用演示数据完整走通",
  }
}
```

---

### 3.3 新建 `apps/web/src/app/api/v1/system/health/route.ts`

```ts
import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getDemoModeConfig, getDemoModeLabel } from "@web/lib/demo-mode"
import { getSystemHealthReport } from "@web/lib/system-health"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(_request: Request) {
  const report = getSystemHealthReport()
  const demoConfig = getDemoModeConfig()
  const demoLabel = getDemoModeLabel()

  const recommendations: string[] = []
  if (demoConfig.isFullDemo) {
    recommendations.push(
      "✅ 全演示模式：所有业务流程使用演示数据，可完整走通预约、认养、购票、反馈闭环",
      "💡 如需启用真实 AI，设置 DEEPSEEK_API_KEY",
      "💡 如需启用真实天气，设置 QWEATHER_API_KEY",
      "💡 短信和支付功能当前仅在演示模式下可用",
    )
  } else {
    const demos = report.services.filter((s) => s.mode === "demo")
    const lives = report.services.filter((s) => s.mode === "live")
    if (demos.length)
      recommendations.push(
        `⚠️ ${demos.length} 项服务运行于演示模式：${demos.map((s) => s.name).join("、")}`,
      )
    if (lives.length)
      recommendations.push(
        `✅ ${lives.length} 项服务已连接：${lives.map((s) => s.name).join("、")}`,
      )
  }

  return jsonResponse(_request, {
    data: { ...report, demoConfig, demoLabel, recommendations },
    meta: { cache: "no-store" },
  })
}
```

---

### 3.4 验证健康检查

```bash
# 在所有外部 API Key 均未设置的情况下
curl -s http://localhost:3000/api/v1/system/health | jq '.'
```

**预期响应结构**：

```json
{
  "data": {
    "timestamp": "2026-06-30T...",
    "services": [
      { "name": "AI 模型 (DeepSeek)", "mode": "demo", ... },
      { "name": "天气服务 (和风天气)", "mode": "demo", ... },
      { "name": "短信服务", "mode": "demo", ... },
      { "name": "支付网关 (微信/支付宝)", "mode": "demo", ... },
      { "name": "IoT 传感器网关", "mode": "demo", ... },
      { "name": "Redis 缓存", "mode": "demo", ... }
    ],
    "overallMode": "demo",
    "demoConfig": { "isFullDemo": true, ... },
    "demoLabel": "全演示模式",
    "recommendations": ["✅ 全演示模式...", "💡 如需启用真实 AI...", ...],
    "summary": "外部服务均未配置，系统运行于全演示模式..."
  }
}
```

---

## 步骤四：构建验证与业务闭环测试（10 分钟）

### 4.1 编译检查

```bash
pnpm build
```

**通过条件**：零错误退出。注意：`/[locale]/routes` 的 `window is not defined` 是已有问题（SSR 兼容性），非本次改动引入。

### 4.2 全流程手动验证

在不设置任何外部 API Key 的条件下（`unset DEEPSEEK_API_KEY QWEATHER_API_KEY SMS_API_KEY SENSOR_API_KEY`），依次验证：

| #   | 验证路径     | 操作                            | 预期结果                             |
| --- | ------------ | ------------------------------- | ------------------------------------ |
| 1   | 首页         | 打开 `http://localhost:3000`    | Hero 区域显示具体温度和出行建议      |
| 2   | 四境浏览     | 点击任一场景卡片                | 场景详情页正常渲染                   |
| 3   | 路线生成     | 进入 `/routes`，选择参数后生成  | 返回具体路线（含节点名、时长、强度） |
| 4   | 院落预约     | 进入 `/booking`，选择院落和日期 | 下单成功                             |
| 5   | 支付确认     | 在支付页点击确认                | 订单状态变为已支付                   |
| 6   | 树木认养     | 进入 `/trees`，选择一棵树认养   | 认养关系创建成功                     |
| 7   | 养护互动     | 在树详情页完成浇水/拍照任务     | 积分增加，状态更新                   |
| 8   | 村民登录     | 进入 `/villager/login`          | 输入手机号，收到 `888888`，登录成功  |
| 9   | 村民任务     | 接取→开始→完成任务              | 收益增加                             |
| 10  | 后台 AI 问答 | Admin → AI 助手 → 提问          | 返回含具体数字的运营摘要             |
| 11  | 后台内容工厂 | Admin → 内容工厂 → 生成导览词   | 返回 150 字以上导览词                |
| 12  | 健康检查     | `curl /api/v1/system/health`    | 返回全部 6 项服务状态                |

---

## 附录 A：已完善降级（无需处理）

以下模块的降级逻辑已经完善，**本次不需要任何改动**：

| 模块       | 文件                                           | 降级方式                                                              |
| ---------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| 支付准备   | `payments/prepare/route.ts`                    | `demoMode: true, hint: "演示模式：点击确认支付即可完成"`              |
| 支付确认   | `payments/confirm/route.ts`                    | 直接设 `status: "paid"` + 正确级联更新订单/认养/树状态                |
| 路线生成   | `routes/generate/route.ts`                     | `selectRouteOption()` 规则引擎基于 6 条预置路线模板                   |
| 设备读数   | `devices/readings/route.ts`                    | 无 `SENSOR_API_KEY` → demo 模式，自动创建演示设备                     |
| 设施告警   | `infrastructure/alerts/route.ts`               | 无传感器数据 → `"传感器数据待硬件部署后接入"`                         |
| 设施决策   | `infrastructure/decide/route.ts`               | 样本不足 → `"传感器和客流样本不足，暂无自动处置建议"`                 |
| 短信发送   | `lib/sms-provider.ts`                          | 三级降级：无配置 / 无 transport / 发送失败 → `{ fallback: "in_app" }` |
| 告警引擎   | `lib/alert-engine.ts`                          | 基于 DB 数据运行，规则完整（夜间滞留/人流/近水/逆行/火险/洪涝）       |
| 控制引擎   | `packages/utils/src/control-engine.ts`         | 规则引擎 + AI 覆盖双层决策                                            |
| 设备心跳   | `lib/device-heartbeat.ts`                      | 90 分钟离线阈值，纯逻辑计算                                           |
| 设备预测   | `lib/device-predictor.ts`                      | 无设备读数 → 返回空数组                                               |
| 养护建议   | `lib/care-advisor.ts`                          | AI 失败 → `"AI 养护建议暂时不可用，请运营人员人工复核"`               |
| 日报生成   | `lib/report-generator.ts`                      | 聚合 DB 数据后调用 AI，失败时抛错由路由 catch 处理                    |
| 智策生成   | `lib/recommendation-generator.ts`              | AI 失败 → 路由层 catch 调用 `getFallbackResponse("recommendation")`   |
| 反馈分类   | `feedback/route.ts`                            | AI 分类失败 → 优雅降级（无分类标记）                                  |
| 模型适配器 | `packages/utils/src/model-provider-adapter.ts` | 无 key → 返回 `{ content: "", provider: "fallback" }`                 |

---

## 附录 B：完整 API 路由清单

### 62 个路由按分组排列

| 分组         | 路由                             | 方法             | 外部依赖        | 当前状态          |
| ------------ | -------------------------------- | ---------------- | --------------- | ----------------- |
| **空间节点** | `/nodes`                         | GET              | 无              | ✅                |
|              | `/nodes/scores`                  | GET              | 无              | ✅                |
|              | `/nodes/scores/[slug]`           | GET              | 无              | ✅                |
| **客流**     | `/presence`                      | GET, POST        | 无              | ✅                |
|              | `/presence/series`               | GET              | 无              | ✅                |
| **天气**     | `/weather`                       | GET              | 和风天气        | ⚠️ 需降级         |
|              | `/weather/alerts`                | GET              | 和风天气        | ✅                |
| **路线**     | `/routes/generate`               | POST             | DeepSeek        | ✅ (规则引擎降级) |
| **院落预约** | `/courtyard-bookings`            | POST             | 无              | ✅                |
| **票务**     | `/ticket-orders`                 | POST             | 无              | ✅                |
| **活动**     | `/activities`                    | GET, POST, PATCH | 无              | ✅                |
|              | `/activity-bookings`             | GET, POST        | 无              | ✅                |
| **树木**     | `/trees`                         | GET              | 无              | ✅                |
|              | `/trees/[code]`                  | GET, PATCH       | 无              | ✅                |
|              | `/trees/[code]/care-logs`        | POST             | 无              | ✅                |
|              | `/tree-adoptions`                | GET, POST, PATCH | Redis (可选)    | ✅                |
| **采摘**     | `/harvest-bookings`              | GET, POST, PATCH | 无              | ✅                |
|              | `/harvest-shipments`             | GET, POST, PATCH | 无              | ✅                |
| **订单**     | `/orders`                        | GET, POST        | 无              | ✅                |
|              | `/me/orders`                     | GET              | 无              | ✅                |
|              | `/me/adoptions`                  | GET              | 无              | ✅                |
| **产品**     | `/products`                      | GET, POST, PATCH | 无              | ✅                |
| **村民**     | `/villagers`                     | GET, POST, PATCH | 无              | ✅                |
|              | `/villagers/[id]/tasks`          | GET              | 无              | ✅                |
|              | `/villager/me`                   | GET              | 无              | ✅                |
|              | `/villager/me/tasks`             | GET, PATCH       | 无              | ✅                |
| **村民认证** | `/villager-auth/request-otp`     | POST             | SMS (可选)      | ✅                |
|              | `/villager-auth/verify-otp`      | POST             | 无              | ✅                |
| **游客认证** | `/auth/request-sms`              | POST             | SMS (可选)      | ✅                |
|              | `/auth/verify-sms`               | POST             | 无              | ✅                |
|              | `/auth/me`                       | GET              | 无              | ✅                |
| **任务**     | `/tasks`                         | GET, POST, PATCH | 无              | ✅                |
| **农事日历** | `/farming-calendar`              | GET, POST, PATCH | 无              | ✅                |
| **反馈**     | `/feedback`                      | GET, POST, PATCH | DeepSeek (可选) | ✅                |
| **IoT 设施** | `/devices`                       | GET, POST, PATCH | 无              | ✅                |
|              | `/devices/readings`              | POST             | 无              | ✅ (demo)         |
|              | `/devices/[id]/readings`         | GET              | 无              | ✅                |
|              | `/infrastructure/sensors`        | POST             | 无              | ✅                |
|              | `/infrastructure/sensors/latest` | GET              | 无              | ✅                |
|              | `/infrastructure/alerts`         | GET              | 无              | ✅                |
|              | `/infrastructure/decide`         | POST             | DeepSeek (可选) | ✅                |
|              | `/infrastructure/commands`       | GET, PATCH       | 无              | ✅                |
| **告警**     | `/alerts`                        | GET, PATCH       | 无              | ✅                |
| **AI**       | `/ai/query`                      | POST             | DeepSeek        | ⚠️ 需降级         |
|              | `/ai/generate-content`           | POST             | DeepSeek        | ⚠️ 需降级         |
| **智策**     | `/recommendations`               | GET              | 无              | ✅                |
|              | `/recommendations/generate`      | POST             | DeepSeek        | ⚠️ 需降级         |
|              | `/recommendations/[id]/approve`  | POST             | 无 (内部调用)   | ✅                |
| **通知**     | `/notifications`                 | GET, POST, PATCH | SMS (可选)      | ✅                |
| **互动**     | `/interactions`                  | GET, POST, PATCH | 无              | ✅                |
|              | `/interactions/upload`           | POST             | 无              | ✅                |
| **分析**     | `/analytics/consumption/by-node` | GET              | 无              | ✅                |
|              | `/analytics/cross/flow-vs-spend` | GET              | DeepSeek (可选) | ✅                |
|              | `/analytics/routes/ranking`      | GET              | 无              | ✅                |
| **日报**     | `/reports`                       | GET, POST        | DeepSeek        | ⚠️ 需降级         |
|              | `/reports/latest`                | GET              | 无              | ✅                |
| **定时任务** | `/cron/daily-report`             | POST             | DeepSeek        | ⚠️ 需降级         |
| **支付**     | `/payments/prepare`              | POST             | 无 (mock_demo)  | ✅                |
|              | `/payments/confirm`              | POST             | 无 (mock_demo)  | ✅                |
|              | `/payments/[id]`                 | GET              | 无              | ✅                |
| **上传**     | `/upload`                        | POST             | 无              | ✅                |
| **隐私**     | `/privacy/consents`              | GET, POST        | 无              | ✅                |
| **系统**     | `/system/health`                 | GET              | 无              | 🆕 本次新建       |

---

## 附录 C：验收标准

| #   | 检查项       | 通过条件                                                                          |
| --- | ------------ | --------------------------------------------------------------------------------- |
| 1   | 首页天气     | 显示具体温度（如 `32℃`）和出行建议（如 "建议清晨或傍晚出行"），不含 "待配置" 字样 |
| 2   | AI 路线生成  | 返回具体路线名称 + 节点列表 + 步行强度，不含 "暂时不可用"                         |
| 3   | AI 内容工厂  | 返回 150 字以上可读导览词/活动脚本/社交文案                                       |
| 4   | AI 问答      | 返回包含具体数字的运营摘要（客流、热门节点等）                                    |
| 5   | 智策推荐     | 返回 3 条以上可执行运营建议                                                       |
| 6   | 支付闭环     | 下单 → 支付确认 → 订单状态变更 → 树木/票务状态联动                                |
| 7   | 健康检查 API | `GET /api/v1/system/health` 返回 200 + 6 项服务完整状态                           |
| 8   | 构建         | `pnpm build` 零新增错误                                                           |
| 9   | 全业务闭环   | 无外部 API Key 条件下可走通游客 + 村民 + 运营三条完整路径                         |
| 10  | TypeScript   | 所有新增/修改文件通过类型检查                                                     |

---

> **执行完成后，系统将可以在零外部依赖的条件下，完整演示从"首页浏览 → 四境体验 → 路线生成 → 认养下单 → 院落预约 → 支付确认 → 村民任务 → 运营后台"的全业务闭环。**
