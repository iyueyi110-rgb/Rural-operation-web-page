# 走马村云脑系统 — 全系统降级处理审计报告 & Codex 修复指令

> **审计日期**: 2026-06-29
> **审计范围**: `apps/web`, `apps/admin`, `packages/ui`, `packages/utils`, `packages/database`, `packages/contracts`
> **审计原则**: 检查系统在所有异常场景（网络不可用、API 超时、数据为空、环境变量缺失、JS 禁用、图片加载失败、低性能设备、浏览器不支持等）下是否有合理的降级策略。

---

## 一、已有降级处理 ✅（保留不动）

| # | 位置 | 降级策略 | 评级 |
|---|------|---------|------|
| 1 | `apps/web/src/lib/weather.ts` | 天气 API 不可用时返回 fallback 静态摘要；`getWeatherCondition` 降级为 `"sunny"` | ✅ 完善 |
| 2 | `apps/web/src/lib/rate-limit.ts` | Redis 不可用时放行请求（`allowed: true`） | ✅ 完善 |
| 3 | `packages/database/src/redis.ts` | `lazyConnect: true`, `maxRetriesPerRequest: 1`, error 事件监听 | ✅ 完善 |
| 4 | `apps/web/src/lib/traffic-forecast.ts` | DeepSeek API 失败时降级为移动平均预测 | ✅ 完善 |
| 5 | `apps/web/src/lib/weather-alerts.ts` | QWeather API 失败或无 key 时返回空数组 | ✅ 完善 |
| 6 | `apps/web/src/components/back-button.tsx` | 浏览器无历史记录时 fallback 到指定 href | ✅ 完善 |
| 7 | `apps/web/src/app/[locale]/routes/route-generator.tsx` | AI 路线生成失败时降级为本地 `selectRouteOption` | ✅ 完善 |
| 8 | `apps/web/src/app/globals.css` + `apps/admin/src/app/globals.css` | `prefers-reduced-motion: reduce` 全局关闭动效 | ✅ 完善 |
| 9 | `apps/web/src/components/count-up.tsx` | 检测 reduced-motion 且用 sessionStorage 避免重播 | ✅ 完善 |
| 10 | `apps/web/src/components/hero-screen.tsx` | 视频 reduceMotion 时暂停并显示 poster 静态图 | ✅ 完善 |
| 11 | `apps/web/src/app/[locale]/layout.tsx` + `apps/admin/src/app/layout.tsx` | 字体 `display: "swap"` 确保文字在字体加载前可见 | ✅ 完善 |
| 12 | 各级 `error.tsx` 文件（web: 8处, admin: 2处） | 路由级错误边界 + retry 按钮 | ✅ 基本完善 |
| 13 | 各级 `loading.tsx` 文件（web: 7处, admin: 2处） | 路由级加载骨架 | ✅ 基本完善 |
| 14 | `apps/admin/src/app/(command)/dashboard/page.tsx` | `useModuleData` hook 统一管理 loading/error/data/refresh | ✅ 完善 |
| 15 | `apps/admin/src/components/dashboard-module-card.tsx` | loading 时按钮 disabled + 旋转动画 + 内容半透明 | ✅ 完善 |
| 16 | `apps/admin/src/components/admin-data-table.tsx` | `isLoading` prop 显示加载文案 | ✅ 完善 |
| 17 | `packages/utils/src/control-engine.ts` | 传感器数据缺失时安全降级（undefined check） | ✅ 基本完善 |
| 18 | `packages/utils/src/scoring-engine.ts` | 天气条件作为安全风险因子 | ✅ 完善 |
| 19 | `apps/web/src/lib/aigc-api.ts` | CORS 处理中有 origin fallback | ✅ 完善 |
| 20 | 多数 lib 函数有 try-catch 包裹 | API 调用异常不导致白屏 | ✅ 良好 |

---

## 二、缺失降级处理 ❌（需修复）

### 🔴 P0 — 阻断级（用户白屏或无响应）

| # | 问题 | 影响 | 涉及文件 |
|---|------|------|---------|
| P0-1 | **缺少 `global-error.tsx`** | layout 层异常导致全站白屏，无法恢复 | `apps/web/src/app/global-error.tsx`（不存在）`apps/admin/src/app/global-error.tsx`（不存在） |
| P0-2 | **缺少 `not-found.tsx`** | 404 页面使用 Next.js 默认样式，与品牌不匹配，无导航出口 | `apps/web/src/app/not-found.tsx`（不存在）`apps/admin/src/app/not-found.tsx`（不存在） |
| P0-3 | **`ModelProviderAdapter` 无 fallback** | `DEEPSEEK_API_KEY` 未配置时直接 `throw Error`，所有 AI 功能不可用 | `packages/utils/src/model-provider-adapter.ts` |
| P0-4 | **`auth-jwt.ts` 无 JWT_SECRET fallback** | `JWT_SECRET` 未设置时直接 throw，鉴权全部失败 | `apps/web/src/lib/auth-jwt.ts` |
| P0-5 | **图片加载无 onError fallback** | 图片 404/加载失败时显示破损图标 | 全局 `<Image>` 使用处 |
| P0-6 | **无 `<noscript>` 降级** | JS 禁用时用户看到空白页 | `apps/web/src/app/[locale]/layout.tsx`, `apps/admin/src/app/layout.tsx` |

### 🟡 P1 — 体验级（功能降级但可用）

| # | 问题 | 影响 | 涉及文件 |
|---|------|------|---------|
| P1-1 | **无 PWA/offline fallback UI** | 离线时前端无提示，用户困惑为何无数据 | `apps/web/src` |
| P1-2 | **SMS 发送无降级通知渠道** | 短信服务不可用时用户收不到验证码，无备选方案 | `apps/web/src/lib/sms-provider.ts` |
| P1-3 | **无 `loading="lazy"` 图片懒加载** | 长列表页面图片全量加载，影响首屏性能 | 各页面图片组件 |
| P1-4 | **无 `blurDataURL` / placeholder** | Next.js Image 无模糊占位，图片加载中为空白 | 全局 `<Image>` 使用处 |
| P1-5 | **无 API 请求超时处理** | `fetch` 无 `AbortController` 超时，网络慢时用户无限等待 | `apps/web/src/lib/aigc-api.ts`, `apps/admin/src/lib/admin-api.ts` |
| P1-6 | **无数据空状态统一组件** | 各页面空状态文案/样式不一致 | `packages/ui/src` 缺少 EmptyState 组件 |
| P1-7 | **无 `prefers-color-scheme: dark` 适配** | 系统中 `color-scheme: light` hardcoded，暗色模式下显示异常 | `apps/web/src/app/globals.css`, `apps/admin/src/app/globals.css` |

### 🟢 P2 — 优化级（锦上添花）

| # | 问题 | 影响 | 涉及文件 |
|---|------|------|---------|
| P2-1 | **无 `content-visibility: auto`** | 长页面（首页/四境页）离屏内容未优化渲染 | `apps/web/src/app/globals.css` |
| P2-2 | **无 `@media print` 打印样式** | 打印时布局混乱 | `apps/web/src/app/globals.css` |
| P2-3 | **无 `prefers-reduced-data` 适配** | 低带宽用户无法获得精简体验 | 全局 |
| P2-4 | **无 WCAG focus-visible 全局保障** | 键盘导航用户可能看不到焦点指示器 | `apps/web/src/app/globals.css` |
| P2-5 | **无 `next.config.mjs` images 优化配置** | 未配置 `remotePatterns`/`formats`/`deviceSizes`，Next.js Image 优化受限 | `apps/web/next.config.mjs` |
| P2-6 | **Admin 部分子页面缺少 loading/error 处理** | `(ai-system)`、`(assets-commerce)`、`(village-work)` 下部分页面可能缺少 | 各子页面 |

---

## 三、Codex 执行指令（按优先级）

### 指令 P0-1：创建 `global-error.tsx`

在以下两个位置创建全局错误边界：

**文件 1**: `apps/web/src/app/global-error.tsx`
```tsx
"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-rice px-6 text-ink">
          <div className="max-w-md rounded-lg border border-stone bg-white p-6 text-center shadow-soft">
            <h1 className="text-xl font-semibold">系统暂时不可用</h1>
            <p className="mt-3 text-sm text-ink/70">
              很抱歉，页面加载过程中发生了错误。请刷新页面重试。
            </p>
            <button
              className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
              onClick={reset}
              type="button"
            >
              刷新页面
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
```

**文件 2**: `apps/admin/src/app/global-error.tsx`
```tsx
"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Admin global error:", error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#ece5d8] px-6 text-[#19201b]">
          <div className="max-w-md rounded-lg border border-[#cfc4b1] bg-white p-6 text-center shadow">
            <h1 className="text-xl font-semibold">运营后台暂时不可用</h1>
            <p className="mt-3 text-sm text-[#19201b]/60">
              系统布局加载失败，请刷新页面或联系技术支持。
            </p>
            <button
              className="mt-5 rounded-full bg-[#19201b] px-5 py-2 text-sm font-semibold text-white"
              onClick={reset}
              type="button"
            >
              刷新页面
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
```

### 指令 P0-2：创建 `not-found.tsx`

**文件 1**: `apps/web/src/app/not-found.tsx`
```tsx
import Link from "next/link"
import { ArrowLeft, Compass } from "lucide-react"

export default function NotFound() {
  return (
    <html lang="zh-CN">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-rice px-6 text-ink">
          <div className="max-w-md rounded-lg border border-stone bg-white p-6 text-center shadow-soft">
            <Compass aria-hidden="true" className="mx-auto h-12 w-12 text-ink/30" />
            <h1 className="mt-4 text-xl font-semibold">页面未找到</h1>
            <p className="mt-3 text-sm text-ink/70">
              您访问的页面不存在或已被移除。可能是链接已过期，或输入的地址有误。
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
                href="/zh-CN"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                返回首页
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
```

**文件 2**: `apps/admin/src/app/not-found.tsx`
```tsx
import Link from "next/link"
import { ArrowLeft, FileX } from "lucide-react"

export default function NotFound() {
  return (
    <html lang="zh-CN">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#ece5d8] px-6 text-[#19201b]">
          <div className="max-w-md rounded-lg border border-[#cfc4b1] bg-white p-6 text-center shadow">
            <FileX aria-hidden="true" className="mx-auto h-12 w-12 text-[#19201b]/30" />
            <h1 className="mt-4 text-xl font-semibold">管理页面未找到</h1>
            <p className="mt-3 text-sm text-[#19201b]/60">
              该管理页面不存在。请检查 URL 或返回仪表盘。
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-[#19201b] px-5 py-2 text-sm font-semibold text-white"
                href="/dashboard"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                返回仪表盘
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
```

### 指令 P0-3：`ModelProviderAdapter` 添加 fallback

修改 `packages/utils/src/model-provider-adapter.ts`：

1. 当 `DEEPSEEK_API_KEY` 不存在时，不抛异常，而是返回一个标记 `provider: "fallback"` 的空结果，让调用方自行降级。
2. 添加 `timeout` 参数（默认 30 秒），超时后不阻塞。

```ts
// 新增常量
const FALLBACK_RESULT: ModelProviderAdapterResult = {
  content: "",
  provider: "fallback",
  model: "none",
  latencyMs: 0,
}

// 修改 complete 方法
static async complete(
  prompt: string,
  options: ModelProviderAdapterOptions = {},
): Promise<ModelProviderAdapterResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat"
  const timeout = options.timeout ?? 30_000
  const startedAt = Date.now()

  if (!apiKey) {
    console.warn("ModelProviderAdapter: DEEPSEEK_API_KEY not configured, using fallback")
    return FALLBACK_RESULT
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: [...], temperature: options.temperature ?? 0.2 }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    // ... existing response handling ...
  } catch (error) {
    console.error("ModelProviderAdapter: request failed, using fallback:", error)
    return { ...FALLBACK_RESULT, latencyMs: Date.now() - startedAt }
  }
}
```

同时更新 `ModelProviderAdapterOptions` 接口添加 `timeout?: number`。

### 指令 P0-4：`auth-jwt.ts` 添加 fallback

修改 `apps/web/src/lib/auth-jwt.ts`：

1. JWT_SECRET 未设置时使用开发默认值（仅在 `NODE_ENV !== "production"` 时）
2. 生产环境缺少时记录严重错误但返回明确错误而非 throw

```ts
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV !== "production") {
    console.warn("JWT_SECRET not set, using dev default (INSECURE)")
    return "zouma-dev-jwt-secret-do-not-use-in-production"
  }
  throw new Error("JWT_SECRET is required in production")
}
```

### 指令 P0-5：图片组件添加 onError fallback & blurDataURL

1. 在 `packages/ui/src` 中创建 `SafeImage` 组件：

```tsx
"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e9e0d2' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='sans-serif' font-size='14'%3E图片加载失败%3C/text%3E%3C/svg%3E"

const PLACEHOLDER_BLUR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 30'%3E%3Crect fill='%23e9e0d2' width='40' height='30'/%3E%3C/svg%3E"

export function SafeImage({ src, alt, ...rest }: ImageProps) {
  const [hasError, setHasError] = useState(false)

  return (
    <Image
      {...rest}
      alt={alt}
      blurDataURL={PLACEHOLDER_BLUR}
      loading="lazy"
      onError={() => setHasError(true)}
      placeholder="blur"
      src={hasError ? FALLBACK_IMAGE : src}
    />
  )
}
```

2. 全局替换 `<Image` 为 `<SafeImage`（搜索所有 `from "next/image"` 的 import）。

### 指令 P0-6：添加 `<noscript>` 降级

在 `apps/web/src/app/[locale]/layout.tsx` 和 `apps/admin/src/app/layout.tsx` 的 `<body>` 内最顶部添加：

```tsx
<noscript>
  <div style={{
    padding: "16px",
    background: "#b93835",
    color: "white",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: 600,
  }}>
    请启用 JavaScript 以获得完整体验。部分功能在禁用 JS 时不可用。
  </div>
</noscript>
```

### 指令 P1-1：添加离线检测 Hook

创建 `apps/web/src/hooks/use-online-status.ts`：

```ts
"use client"

import { useEffect, useState } from "react"

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  return isOnline
}
```

在 `apps/web/src/app/[locale]/layout.tsx` 中添加离线提示条（置于 `<body>` 顶部，在 `<NextIntlClientProvider>` 外部）：

```tsx
import { OfflineBanner } from "@web/components/offline-banner"
// ...
<OfflineBanner />
```

创建 `apps/web/src/components/offline-banner.tsx`：
```tsx
"use client"

import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "@web/hooks/use-online-status"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="sticky top-0 z-[9999] flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
      <WifiOff aria-hidden="true" className="h-4 w-4" />
      当前处于离线状态，部分功能不可用。网络恢复后将自动更新。
    </div>
  )
}
```

### 指令 P1-2：SMS 降级通知

修改 `apps/web/src/lib/sms-provider.ts`：
1. SMS 发送失败时记录到数据库 notification 表作为 in_app 通知的 fallback
2. 返回 `{ success: false, fallback: "in_app" }` 而非 throw

### 指令 P1-3 & P1-4：图片优化配置

修改 `apps/web/next.config.mjs`：

```js
const nextConfig = {
  transpilePackages: [...],
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

### 指令 P1-5：API 请求超时处理

修改 `apps/admin/src/lib/admin-api.ts` 和 `apps/web/src/lib/aigc-api.ts`：
1. 为 `fetch` 添加 `AbortController` + 默认 15 秒超时
2. 创建 `fetchWithTimeout` 工具函数

```ts
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15_000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
```

### 指令 P1-6：创建 EmptyState 统一组件

在 `packages/ui/src` 中创建 `empty-state.tsx`：

```tsx
import { type ReactNode } from "react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/50 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-ink/30">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink/70">{title}</h3>
      {description ? <p className="mt-1 text-sm text-ink/50">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
```

然后在所有 admin 和 web 页面中，将零散的"暂无数据"文本替换为 `<EmptyState>`。

### 指令 P1-7：暗色模式基础适配

修改 `apps/web/src/app/globals.css` 和 `apps/admin/src/app/globals.css`，添加：

```css
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --background: #19201b;
    --foreground: #f3eee3;
    --surface: #1e2722;
    --line: #3a4a3d;
  }
  /* 确保图片和视频在暗色模式下不过亮 */
  img, video {
    opacity: 0.92;
  }
}
```

### 指令 P2-1 ~ P2-6：优化项

| 指令 | 操作 | 文件 |
|------|------|------|
| P2-1 | 在 `.section-card, .scene-card, .route-card` 等重复卡片容器添加 `content-visibility: auto; contain-intrinsic-size: auto 400px;` | `apps/web/src/app/globals.css` |
| P2-2 | 添加 `@media print { .no-print { display: none !important; } header, nav, footer { display: none; } }` | 全局 CSS |
| P2-3 | 在 `SafeImage` 中添加 `prefers-reduced-data` 检测，低带宽时使用更小的 imageSizes | `packages/ui/src/safe-image.tsx` |
| P2-4 | 添加全局 `:focus-visible { outline: 2px solid #b93835; outline-offset: 2px; }` 并审计现有 button/a 是否有覆盖 | 全局 CSS |
| P2-5 | 在 `next.config.mjs` 添加 `images` 配置块（见 P1-3） | `apps/web/next.config.mjs` |
| P2-6 | 逐个检查 `(ai-system)/*`, `(assets-commerce)/*`, `(village-work)/*` 下页面，确保有 try-catch + loading state | 各子页面 |

---

## 四、验证清单

完成所有 P0/P1 指令后，按以下方式验证：

- [ ] `global-error.tsx`: 在 layout.tsx 中故意 throw Error，确认全局错误界面出现而非白屏
- [ ] `not-found.tsx`: 访问 `/zh-CN/nonexistent`，确认显示自定义 404 而非 Next.js 默认页
- [ ] ModelProviderAdapter: 临时取消 `DEEPSEEK_API_KEY`，确认路线生成/客流预测不崩溃
- [ ] 图片 fallback: 故意使用不存在的图片路径，确认显示 SVG fallback 而非破损图标
- [ ] `<noscript>`: 在浏览器 DevTools 中禁用 JS 刷新页面，确认显示提示横幅
- [ ] 离线检测: 在 DevTools Network 面板切到 Offline，确认显示离线提示条
- [ ] `prefers-reduced-motion`: 在系统设置开启"减少动态效果"，确认所有动画/视频停止
- [ ] 暗色模式: 在系统设置切到 Dark Mode，确认页面可读、图片不过亮
- [ ] API 超时: 使用 DevTools 限速到 Slow 3G，确认页面有 loading 状态且不会无限等待
- [ ] EmptyState: 遍历所有管理列表页面，确认无数据时显示统一空态
