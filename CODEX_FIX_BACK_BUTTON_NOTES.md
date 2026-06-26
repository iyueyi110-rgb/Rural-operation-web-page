# Codex 补充注意事项：返回上一级按钮

> 配合 `CODEX_FIX_BACK_BUTTON.md` 使用，以下为审查后发现的额外问题和修正

---

## ⚠️ 关键修正

### 修正 1: `window.history.length` 在 SPA 中不可靠

`CODEX_FIX_BACK_BUTTON.md` 中 `BackButton` 使用 `window.history.length > 1` 判断是否有历史记录。**这在 Next.js App Router 中不可靠**：客户端导航（`router.push`）不一定增加 `history.length`。

**更正后的 `BackButton` 实现**:

```tsx
"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, type ReactNode } from "react"

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
  const canGoBack = useRef(false)

  useEffect(() => {
    // 如果当前 URL 不是直接打开的（有 referrer 或历史记录），标记可返回
    canGoBack.current = document.referrer !== "" || window.history.length > 2
  }, [])

  function handleBack() {
    if (canGoBack.current) {
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
        "flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-none bg-transparent px-2 py-1 text-sm font-semibold text-white/86 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      }
    >
      {icon ?? <ArrowLeft aria-hidden="true" className="h-4 w-4" />}
      {label}
    </button>
  )
}
```

**关键改动**:
- 用 `useRef` + `useEffect` 替代每次点击时检查 `history.length`
- 检查 `document.referrer`（从哪个页面跳转来的）
- `<button>` 添加 `cursor-pointer`、`border-none`、`bg-transparent`（避免浏览器默认按钮样式）

---

### 修正 2: `trees/[code]` 页面的 fallback 不同

该页面当前的 `backHref={`/${params.locale}/trees`}`，**不是** `/{locale}`。应该回到树木列表页。

| 页面 | 当前 backHref | fallbackHref 应设为 |
|------|--------------|-------------------|
| `trees/[code]/page.tsx` | `/${params.locale}/trees` | `/${params.locale}/trees` |
| 其他 10 个页面 | `/${params.locale}` | `/${params.locale}` |

> ⚠️ 不要统一写死 `/{locale}`，每个页面的 `fallbackHref` 必须等于该页面当前的 `backHref`

---

### 修正 3: 场景详情页是 Server Component

`scenes/[slug]/page.tsx` 使用了 `setRequestLocale`、`getTranslations` 等服务端 API，是 **Server Component**。`BackButton` 作为 `"use client"` 组件可以在此使用，但 **`ArrowLeft` 不能直接传给 Server Component 中的 client component 作为 prop？可以，因为它是序列化后的 JSX 元素。

但有一个细节问题：场景详情页的 header 使用 `fixed` 定位 + `bg-ink/78` + `backdrop-blur-xl`，`BackButton` 的默认 className 是 `text-white/86`，两者不冲突。

---

### 修正 4: 村民门户回退逻辑

村民门户的 `VillagerLayout` 中，Dashboard 本身就是"首页"，不应该显示返回按钮。

**修正方案**：仅在非 dashboard 页面显示返回按钮。

```tsx
// 在 VillagerLayout 中
const isDashboard = pathname.endsWith("/villager/dashboard")
const isLogin = pathname.endsWith("/villager/login")

// 返回按钮仅在非登录、非 dashboard 时显示
{!isLogin && !isDashboard && (
  <div className="sticky top-0 z-30 flex h-12 items-center border-b border-stone bg-white/90 px-4 backdrop-blur-sm">
    <button
      type="button"
      onClick={() => router.back()}
      className="flex cursor-pointer items-center gap-2 border-none bg-transparent text-sm font-bold text-moss"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      {t("nav.back")}
    </button>
  </div>
)}
```

> 村民门户内部页面（tasks/earnings/notifications）在同一 layout 下切换，`router.back()` 自然回到上一页。

---

## 📋 翻译文件完整检查

### `apps/web/messages/zh-CN.json`

需要确认以下键存在，不存在则新增：

```json
{
  "routes": {
    "nav": {
      "backHome": "返回首页"
    }
  },
  "booking": {
    "nav": {
      "backHome": "返回首页"
    }
  },
  "trees": {
    "nav": {
      "backHome": "返回首页"
    }
  },
  "me": {
    "nav": {
      "backHome": "返回首页"
    }
  },
  "scenes": {
    "detail": {
      "backHome": "返回首页"
    }
  },
  "villagerSystem": {
    "nav": {
      "dashboard": "工作台",
      "tasks": "任务",
      "earnings": "收益",
      "notifications": "通知",
      "logout": "退出",
      "back": "返回"
    }
  }
}
```

> ⚠️ 检查发现各页面使用 `t("nav.backHome")` 但 **namespace 各不相同**（`routes.nav.backHome`、`booking.nav.backHome`、`trees.nav.backHome`...）。新增的 `nav.back` 键需要在**每个 namespace** 下添加，或统一在 `common` namespace 下放置共用翻译键。

**推荐方案**：在 `common` 下添加通用返回键，然后各页面使用 `getTranslations("common")` 引用：

```json
// zh-CN.json
"common": {
  "back": "返回上一级",
  "backHome": "返回首页"
}
```

在页面中使用：
```tsx
const common = await getTranslations("common")
// common("back") → "返回上一级"
```

---

## 🔍 页面实际 backHref 完整对照表

| # | 文件 | 当前 backHref | 翻译 namespace |
|---|------|-------------|---------------|
| 1 | `routes/page.tsx` | `/${params.locale}` | `routes` |
| 2 | `booking/page.tsx` | `/${params.locale}` | `booking` |
| 3 | `me/page.tsx` | `/${params.locale}` | `me` |
| 4 | `privacy/page.tsx` | `/${params.locale}` | `privacy` |
| 5 | `activities/page.tsx` | `/${params.locale}` | `activities` |
| 6 | `trees/page.tsx` | `/${params.locale}` | `trees` |
| 7 | `trees/[code]/page.tsx` | **`/${params.locale}/trees`** | `trees` |
| 8 | `products/page.tsx` | `/${params.locale}` | `products` |
| 9 | `feedback/page.tsx` | `/${params.locale}` | `feedback` |
| 10 | `calendar/page.tsx` | `/${params.locale}` | `calendar` |
| 11 | `tickets/page.tsx` | `/${params.locale}` | `tickets` |
| 12 | `scenes/[slug]/page.tsx` | `/${params.locale}` (自定义 header) | `scenes` |

---

## 🚫 禁止事项

1. **不要删除原有的 `backHref` 属性** — 保留它确保 `backElement` 不存在时降级
2. **不要修改翻译文件中已有的任何键** — 只新增 `nav.back` 等新键
3. **不要修改 `packages/ui/src/index.ts` 的导出** — `PageHeader` 已正确导出
4. **不要在场景详情页使用 `PageHeader`** — 该页有自定义 header 布局（含横向场景导航）
5. **不要改变现有页面的 import 顺序** — 只添加 `BackButton` 和 `common` 翻译的 import
6. **不要修改 `villager/login` 页** — 登录页不需要返回按钮

---

## ✅ 改动顺序建议

1. **先改 `PageHeader`**（`packages/ui/src/page-header.tsx`）— 新增 `backElement` prop
2. **新建 `BackButton`**（`apps/web/src/components/back-button.tsx`）
3. **改翻译文件**（3 个 messages json）
4. **改 web 子页面**（Fix 3 的 11 个文件，逐个改）
5. **改场景详情页**（Fix 4）
6. **改 AdminShell**（Fix 5）
7. **改 VillagerLayout**（Fix 6）
8. **重启 `pnpm dev`** 验证
