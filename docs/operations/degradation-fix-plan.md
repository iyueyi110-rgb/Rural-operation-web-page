# Codex 降级演示修复执行计划 v2 — 走马村云脑系统

> **目标**：修复无 fallback 的 API（避免 503/404），为 Mock 功能添加演示模式标识。
> **原则**：最小改动、不改架构、不改真实支付/短信（课程作业不需要）。
> **预计工时**：1-2 小时
> **v2 修正**：经逐文件代码审查，原 Fix 5（infrastructure/decide）内部已有 AI→规则引擎降级，仅需补 try/catch；原 Fix 7（OTP 横幅）在线上 NODE_ENV=production 下不显示是正确行为。

---

## 一、修正说明

| 原计划 | 审查结果 | 修正 |
|--------|----------|------|
| Fix 5: infrastructure/decide "AI 失败返回空数组" | **代码已有降级**：`generateControlCommands()` 在 AI 失败时自动 fallback 到 `computeControlSuggestions` 规则引擎 | 仅补外层 try/catch 防止 DB 崩溃 |
| Fix 7: OTP 横幅显示验证码 | 当前代码检查 `NODE_ENV === "development"`，Vercel 线上是 production → 不显示，**这是安全设计** | 不做修改 |

---

## 📋 执行任务（修正后共 6 项）

### 🔴 批次 1：修复 503/404 错误（必须修）

---

#### Fix 1：日报生成 POST `/api/v1/reports` — 添加静态 Fallback

**文件**：`apps/web/src/app/api/v1/reports/route.ts`

**问题**：AI 生成失败直接返回 503。

**修复**：AI 调用失败时，返回一份静态日报模板，而非 503：
```typescript
// 当前（约 52-58 行）：
if (!aiResult) {
  return NextResponse.json(
    { error: "AI 日报生成失败" },
    { status: 503 }
  )
}

// 改为：
if (!aiResult) {
  return NextResponse.json({
    report: {
      date: new Date().toISOString().split("T")[0],
      summary: "今日运营数据汇总",
      sections: [
        { title: "客流概览", content: "今日客流平稳，各节点运行正常。" },
        { title: "活动情况", content: "今日无异常活动记录。" },
        { title: "告警汇总", content: "今日无告警事件。" },
      ],
      generatedBy: "fallback_template",
    },
  })
}
```

**验证**：POST `/api/v1/reports` 即使 AI 不可用也返回 200。

---

#### Fix 2：定时日报 `/api/v1/cron/daily-report` — 同上

**文件**：`apps/web/src/app/api/v1/cron/daily-report/route.ts`

**问题**：与 Fix 1 相同，AI 失败返回 503。

**修复**：与 Fix 1 相同的静态模板 fallback。

**验证**：POST `/api/v1/cron/daily-report` 返回 200。

---

#### Fix 3：创建 `/api/v1/privacy/route.ts`

**文件**：`apps/web/src/app/api/v1/privacy/route.ts`（新建）

**问题**：目录存在但无路由文件，请求返回 404。

**修复**：创建简单的 GET 路由，返回隐私政策版本信息：
```typescript
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    version: "1.0",
    lastUpdated: "2026-07-02",
    sections: ["数据收集", "数据使用", "数据存储", "用户权利", "联系方式"],
  })
}
```

**验证**：GET `/api/v1/privacy` 返回 200。

---

#### Fix 4：创建 `/api/v1/system/health/route.ts`

**文件**：`apps/web/src/app/api/v1/system/health/route.ts`（新建）

**问题**：目录存在但无路由文件，请求返回 404。

**修复**：创建健康检查 GET 路由：
```typescript
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
```

**验证**：GET `/api/v1/system/health` 返回 200。

---

### 🟠 批次 2：改进降级体验

---

#### Fix 5：基础设施决策 — 补外层 try/catch

**文件**：`apps/web/src/app/api/v1/infrastructure/decide/route.ts`

**审查结果**：`generateControlCommands()` 内部已有完善的降级逻辑（AI 失败 → 规则引擎 `computeControlSuggestions`），不需要改。但路由处理器缺少 try/catch，DB 崩溃等极端情况会导致 500。

**修复**：在 POST handler 外加 try/catch：
```typescript
export async function POST(request: Request) {
  // ...existing auth + rate limit code...

  try {
    const data = await generateControlCommands()
    return jsonResponse(
      request,
      {
        data,
        meta: {
          total: data.length,
          degraded: data.length === 0,
          reason: data.length === 0 ? "传感器和客流样本不足，暂无自动处置建议" : undefined,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Infrastructure decision failed:", error)
    return jsonResponse(
      request,
      {
        data: [],
        meta: {
          total: 0,
          degraded: true,
          reason: "决策服务暂时不可用，请稍后重试",
        },
      },
      { status: 200 },  // 返回 200 而非 500，前端可正常展示
    )
  }
}
```

**验证**：即使 DB 异常，POST 也返回 200 + `degraded: true`，而非 500 崩溃。

---

#### Fix 6：支付页面 — 添加"演示模式"标识

**文件**：`apps/web/src/components/demo-payment-dialog.tsx`

**问题**：用户不知道支付是模拟的。

**修复**：在支付对话框中添加醒目但不吓人的演示标识：
```tsx
{/* 在支付对话框顶部添加 */}
<div className="rounded-t-lg bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
  <span className="text-xs font-semibold text-amber-700">
    🧪 演示模式 — 支付功能为模拟演示，不会产生真实交易
  </span>
</div>
```

**验证**：点击支付按钮，对话框顶部出现黄色演示提示横幅。

---

### 🟢 批次 3：不做修改（审查后排除）

#### ~~Fix 7：OTP 登录页显示验证码~~ → 不修改

**文件**：`apps/web/src/components/otp-demo-banner.tsx`

**审查结果**：当前代码 `process.env.NODE_ENV !== "development"` 控制显示 → Vercel 线上是 `production`，横幅自动隐藏。这是正确的安全设计——线上不应展示验证码。

> ✅ 无需修改。

---

## 📊 修改文件汇总

| # | 文件 | 操作 | 风险 |
|---|------|------|:--:|
| 1 | `apps/web/src/app/api/v1/reports/route.ts` | 改 catch → 静态 fallback | 低 |
| 2 | `apps/web/src/app/api/v1/cron/daily-report/route.ts` | 改 catch → 静态 fallback | 低 |
| 3 | `apps/web/src/app/api/v1/privacy/route.ts` | **新建** | 极低 |
| 4 | `apps/web/src/app/api/v1/system/health/route.ts` | **新建** | 极低 |
| 5 | `apps/web/src/app/api/v1/infrastructure/decide/route.ts` | 补 try/catch | 低 |
| 6 | `apps/web/src/components/demo-payment-dialog.tsx` | 加演示横幅 | 极低 |

> **共 6 项，2 个新建，4 个修改，约 30 行改动，无新依赖，无架构变更。**

---

## 五、不改动清单

| 项目 | 原因 |
|------|------|
| 支付系统接入真实微信/支付宝 | 课程作业不需要真实支付 |
| 短信 Transport 注入 | 课程作业用固定 OTP 即可 |
| OTP 演示横幅 | 线上 NODE_ENV=production 自动隐藏，安全设计 ✅ |
| infrastructure/decide AI 降级 | `generateControlCommands()` 内部已有 AI→规则引擎 fallback ✅ |
| IoT 传感器真实数据 | 硬件未部署，demo 模式已足够 |
| 首页/场景/路线等静态数据 | 这些是产品内容配置，不是 Bug |

---

## 七、给 Codex 的执行指令

```
Codex，请按照 docs/degradation-fix-plan.md 执行降级修复。

关键约束：
1. 只修改上述 7 个文件，不要动其他文件
2. 新建文件从现有 API 路由复制 import 风格
3. 每次修改后 git commit，格式：fix(degradation): <描述>
4. 修改完成后运行 pnpm build 确认无编译错误
5. 不要引入新 npm 包，不要改架构

从批次 1（Fix 1）开始。
```
