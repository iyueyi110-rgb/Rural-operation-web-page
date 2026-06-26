# Codex 执行指令：前端添加"返回上一级"按钮

> **日期**: 2026-06-25
> **问题**: 所有子页面的返回按钮都硬编码跳转到首页，用户无法回到浏览历史中的上一页
> **原则**: 最小改动，保持现有 UI 风格一致，不破坏现有功能

---

## 现状分析

| 区域 | 当前行为 | 问题 |
|------|----------|------|
| **Web 子页面** (routes, booking, trees 等 10+ 页面) | `PageHeader` 的 `backHref` 全部写死为 `/{locale}` | 只能回首页，无法回到上一页 |
| **Web 场景详情页** (`/scenes/[slug]`) | 自定义 header，`href={/${params.locale}}` 写死 | 同上 |
| **Admin 管理后台** | 无任何返回按钮，仅靠侧边栏导航 | 层级深的操作无法快速返回 |
| **村民门户** (`/villager/*`) | 底部标签栏导航，无返回按钮 | 任务详情等深层页面缺少返回路径 |

---

## Fix 1: 创建通用 `BackButton` 客户端组件（Web 端）

### 新建文件

**路径**: `apps/web/src/components/back-button.tsx`

```tsx
"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

export function BackButton({
  fallbackHref,
  label,
  className,
  icon,
}: {
  fallbackHref: string
  label: string
  className?: string
  icon?: ReactNode
}) {
  const router = useRouter()

  function handleBack() {
    // 尝试使用浏览器历史返回，如果没有历史则跳转到 fallback
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={
        className ??
        "flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-white/86 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      }
    >
      {icon ?? <ArrowLeft aria-hidden="true" className="h-4 w-4" />}
      {label}
    </button>
  )
}
```

### 说明

- 使用 `<button>` 而非 `<Link>`，因为需要执行 JS 逻辑
- 优先调用 `router.back()` 利用浏览器历史记录
- 如果用户直接访问该页面（无历史记录），降级跳转到 `fallbackHref`（首页）
- 保持与 `PageHeader` 中 `<Link>` 完全相同的 CSS 样式
- `icon` 支持自定义，默认使用 `ArrowLeft`

---

## Fix 2: 修改 `PageHeader` 支持 `BackButton`

### 修改文件

**路径**: `packages/ui/src/page-header.tsx`

当前 `PageHeader` 左侧使用 `<Link href={backHref}>`，改造为同时支持传入 `backElement`（自定义返回元素），如果不传则使用原有 `<Link>` 行为（保证向后兼容）。

```tsx
import Link from "next/link"
import type { ReactNode } from "react"

import { Section } from "./section"

export function PageHeader({
  backHref,
  backLabel,
  rightLabel,
  icon,
  backElement,
}: {
  backHref: string
  backLabel: string
  rightLabel?: string
  icon?: ReactNode
  /** 传入自定义返回元素（如 BackButton），不传则使用默认 Link */
  backElement?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/88 text-white backdrop-blur-xl">
      <Section className="flex h-16 items-center justify-between gap-4">
        {backElement ?? (
          <Link
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-white/86 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            href={backHref}
          >
            {icon}
            {backLabel}
          </Link>
        )}
        {rightLabel ? (
          <div className="min-w-0 truncate rounded-full border border-white/12 bg-white/8 px-3 py-1 text-right text-sm font-semibold text-white/72">
            {rightLabel}
          </div>
        ) : null}
      </Section>
    </header>
  )
}
```

### 改动说明

- 新增可选 prop `backElement?: ReactNode`
- 如果传入了 `backElement`，直接渲染它替代默认的 `<Link>`
- 如果不传，完全保持原有行为，**现有 10+ 个页面无需修改也能正常工作**

---

## Fix 3: 修改 Web 子页面使用 `BackButton`

### 涉及页面（共 11 个文件）

以下页面全部使用 `PageHeader`，需要逐一替换：

| # | 文件路径 |
|---|---------|
| 1 | `apps/web/src/app/[locale]/routes/page.tsx` |
| 2 | `apps/web/src/app/[locale]/booking/page.tsx` |
| 3 | `apps/web/src/app/[locale]/me/page.tsx` |
| 4 | `apps/web/src/app/[locale]/privacy/page.tsx` |
| 5 | `apps/web/src/app/[locale]/activities/page.tsx` |
| 6 | `apps/web/src/app/[locale]/trees/page.tsx` |
| 7 | `apps/web/src/app/[locale]/trees/[code]/page.tsx` |
| 8 | `apps/web/src/app/[locale]/products/page.tsx` |
| 9 | `apps/web/src/app/[locale]/feedback/page.tsx` |
| 10 | `apps/web/src/app/[locale]/calendar/page.tsx` |
| 11 | `apps/web/src/app/[locale]/tickets/page.tsx` (如存在) |

### 修改模式（以 `routes/page.tsx` 为例）

**修改前**:
```tsx
import { ArrowLeft, Clock, MapPin } from "lucide-react"
// ...
import { PageHeader, Section } from "@ui/index"

export default async function RoutesPage({ params }: { params: { locale: Locale } }) {
  // ...
  return (
    <main>
      <PageHeader
        backHref={`/${params.locale}`}
        backLabel={t("nav.backHome")}
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightLabel={t("nav.phase")}
      />
```

**修改后**:
```tsx
import { ArrowLeft, Clock, MapPin } from "lucide-react"
// ...
import { PageHeader, Section } from "@ui/index"
import { BackButton } from "@web/components/back-button"

export default async function RoutesPage({ params }: { params: { locale: Locale } }) {
  // ...
  return (
    <main>
      <PageHeader
        backHref={`/${params.locale}`}
        backLabel={t("nav.backHome")}
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightLabel={t("nav.phase")}
        backElement={
          <BackButton
            fallbackHref={`/${params.locale}`}
            label={t("nav.back")}
            icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
          />
        }
      />
```

> ⚠️ **每个页面的 `fallbackHref` 保持现有的 `backHref` 值**（即 `/${params.locale}`）

### 翻译文本

需要在 `messages/zh-CN.json`、`en.json`、`ja.json` 中添加新的翻译键（如果 `nav.back` 不存在）：

**zh-CN.json**:
```json
"nav": {
  "backHome": "返回首页",
  "back": "返回上一级"
}
```

**en.json**:
```json
"nav": {
  "backHome": "Back to Home",
  "back": "Go Back"
}
```

**ja.json**:
```json
"nav": {
  "backHome": "ホームに戻る",
  "back": "前に戻る"
}
```

---

## Fix 4: 修改场景详情页自定义 Header

### 修改文件

**路径**: `apps/web/src/app/[locale]/scenes/[slug]/page.tsx`

该页面的 header 是自定义的，不使用 `PageHeader`。需要单独处理。

**修改前**（第 57-60 行附近）:
```tsx
<Link className="flex items-center gap-2 text-sm font-semibold text-white/86" href={`/${params.locale}`}>
  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
  {t("detail.backHome")}
</Link>
```

**修改后**:
```tsx
import { BackButton } from "@web/components/back-button"

// 在 header 中替换 Link 为 BackButton
<BackButton
  fallbackHref={`/${params.locale}`}
  label={t("detail.back")}
  className="flex items-center gap-2 text-sm font-semibold text-white/86"
  icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
/>
```

> ⚠️ 需要添加翻译键 `detail.back`: `"返回上一级"` / `"Go Back"` / `"前に戻る"`

---

## Fix 5: Admin 管理后台添加返回按钮

### 修改文件

**路径**: `apps/admin/src/app/admin-shell.tsx`

在内容区顶部添加一个固定的返回按钮。

**修改后**:
```tsx
"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"

import { AdminSidebar } from "@admin/components/admin-sidebar"

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey((current) => current + 1)
    router.refresh()
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-rice text-ink">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <AdminSidebar onRefresh={refresh} />
        <section className="min-w-0" key={refreshKey}>
          {/* 返回上一级按钮 */}
          <div className="sticky top-0 z-30 flex h-12 items-center border-b border-stone bg-white/80 px-4 backdrop-blur-sm sm:px-6 lg:px-7">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-water transition hover:bg-water/10"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              返回上一级
            </button>
          </div>
          <div className="p-4 sm:p-6 lg:p-7">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
```

### 改动说明

- 在每个 admin 页面内容区顶部添加 sticky 返回按钮栏
- `router.back()` 利用浏览器历史返回
- 无历史时降级到 `/dashboard`
- 样式保持 admin 现有的设计风格（`text-water`、`bg-white/80`、`backdrop-blur-sm`）

---

## Fix 6: 村民门户子页面添加返回按钮

### 修改文件

**路径**: `apps/web/src/app/[locale]/villager/layout.tsx`

在村民布局顶部添加返回按钮（登录页除外）。

在 `isLogin` 判断之后、内容区之前添加：

```tsx
import { ArrowLeft } from "lucide-react"
import { BackButton } from "@web/components/back-button"

// 在 return 的 children 渲染前添加非登录页的返回按钮
{!isLogin && (
  <div className="sticky top-0 z-30 flex h-12 items-center bg-white/90 px-4 backdrop-blur-sm border-b border-stone">
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back()
        } else {
          router.replace(`/${locale}/villager/dashboard`)
        }
      }}
      className="flex items-center gap-2 text-sm font-bold text-moss"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("layout.back")}
    </button>
  </div>
)}
```

> ⚠️ 村民页面使用的是 `VillagerLayout`（客户端组件），不需要额外导入 `BackButton`，可以直接内联逻辑。翻译键需添加 `villagerSystem.layout.back`: `"返回"` / `"Back"` / `"戻る"`

---

## 改动汇总

| Fix | 文件 | 改动类型 |
|-----|------|----------|
| Fix 1 | `apps/web/src/components/back-button.tsx` | **新建** |
| Fix 2 | `packages/ui/src/page-header.tsx` | 修改（新增 prop，向后兼容） |
| Fix 3 | `apps/web/src/app/[locale]/{routes,booking,me,privacy,activities,trees,trees/[code],products,feedback,calendar,tickets}/page.tsx` (11个) | 修改（各加 `backElement` prop） |
| Fix 4 | `apps/web/src/app/[locale]/scenes/[slug]/page.tsx` | 修改（自定义 header） |
| Fix 5 | `apps/admin/src/app/admin-shell.tsx` | 修改（添加顶部返回栏） |
| Fix 6 | `apps/web/src/app/[locale]/villager/layout.tsx` | 修改（添加返回按钮） |
| — | `apps/web/messages/{zh-CN,en,ja}.json` | 修改（添加翻译键） |

---

## ⚠️ 注意事项

1. **不影响无历史的直接访问**: `window.history.length > 1` 确保用户直接打开页面时降级到首页，不会出现"返回"无反应
2. **保持现有 UI 风格**: 所有按钮复用当前设计系统（`text-white/86`、`hover:bg-white/10`、`rounded-full` 等）
3. **PageHeader 向后兼容**: 不传 `backElement` 时完全保留原有行为，未修改的页面不受影响
4. **村民登录页不加返回按钮**: `isLogin` 判断排除 `/villager/login`
5. **翻译键**: 如果某个翻译键已存在则跳过，只添加缺失的
6. **不要删除任何原有代码**: `backHref` 属性保留，仅添加 `backElement` 覆盖
7. **Admin 返回按钮是额外行**: 会占用约 48px 高度，但仅在页面顶部 sticky
