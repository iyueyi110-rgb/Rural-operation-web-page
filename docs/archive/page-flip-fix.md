# 首页翻页交互 — Codex 修复指令

> **问题：** 当前首页是纵向滚动，用户要求点击"开始浏览"后一页一页翻转，不是上下滑动。
> **改动：** 3 个文件（1 新建 + 2 修改）

---

## FIX-1 🆕 新建全屏翻页容器

**文件：** `apps/web/src/components/fullscreen-page-deck.tsx`

```tsx
"use client"

import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

interface PageDeckProps {
  children: ReactNode[]
  onPageChange?: (index: number) => void
}

export function FullscreenPageDeck({ children, onPageChange }: PageDeckProps) {
  const pages = Array.isArray(children) ? children : [children]
  const [current, setCurrent] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioning = useRef(false)

  const goTo = useCallback((index: number) => {
    if (isTransitioning.current || index < 0 || index >= pages.length || index === current) return
    isTransitioning.current = true
    setCurrent(index)
    onPageChange?.(index)
    setTimeout(() => { isTransitioning.current = false }, 600)
  }, [current, onPageChange, pages.length])

  const goNext = useCallback(() => goTo(current + 1), [current, goTo])
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo])

  // keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goNext() }
      if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goPrev() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goNext, goPrev])

  // mouse wheel
  useEffect(() => {
    let wheelTimeout: ReturnType<typeof setTimeout>
    const handler = (e: WheelEvent) => {
      if (wheelTimeout) return
      wheelTimeout = setTimeout(() => { wheelTimeout = undefined as unknown as ReturnType<typeof setTimeout> }, 800)
      if (e.deltaY > 40) goNext()
      else if (e.deltaY < -40) goPrev()
    }
    window.addEventListener("wheel", handler, { passive: true })
    return () => window.removeEventListener("wheel", handler)
  }, [goNext, goPrev])

  return (
    <div ref={containerRef} className="relative h-screen w-screen overflow-hidden bg-ink">
      {pages.map((page, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateY(${(i - current) * 100}%)`,
            zIndex: i === current ? 1 : 0,
          }}
        >
          {page}
        </div>
      ))}

      {/* 底部指示器 */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/10 px-4 py-2 backdrop-blur-lg">
        {pages.map((_, i) => (
          <button
            key={i}
            aria-label={`Page ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-lychee" : "w-2 bg-white/40 hover:bg-white/60"}`}
            onClick={() => goTo(i)}
            type="button"
          />
        ))}
      </div>

      {/* 下一页按钮（非末页时显示） */}
      {current < pages.length - 1 ? (
        <button
          aria-label="下一页"
          className="fixed bottom-24 left-1/2 z-50 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-lg transition hover:bg-white/30 animate-bounce"
          onClick={goNext}
          type="button"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  )
}
```

### 外部调用方式

```tsx
// page.tsx 中：
<FullscreenPageDeck>
  <HeroScreen locale={params.locale} weather={weather} />
  <HistoryScroll />
  <RealmMapGateway />
  <HomeAdoptionFeature locale={params.locale} />
</FullscreenPageDeck>
```

---

## FIX-2 ✏️ 修改 page.tsx — 包裹翻页容器

**文件：** `apps/web/src/app/[locale]/page.tsx`

当前 return 块（L45-L53）：
```tsx
  return (
    <main className="overflow-hidden text-ink">
      <HomeHeader locale={params.locale} />
      <HeroScreen locale={params.locale} weather={weather} />
      <HistoryScroll />
      <RealmMapGateway />
      <HomeAdoptionFeature locale={params.locale} />
    </main>
  )
```

替换为：
```tsx
  return (
    <main className="overflow-hidden text-ink">
      <HomeHeader locale={params.locale} />
      <FullscreenPageDeck>
        <HeroScreen locale={params.locale} weather={weather} />
        <HistoryScroll />
        <RealmMapGateway />
        <HomeAdoptionFeature locale={params.locale} />
      </FullscreenPageDeck>
    </main>
  )
```

同时在文件头部追加 import：
```tsx
import { FullscreenPageDeck } from "@web/components/fullscreen-page-deck"
```

---

## FIX-3 ✏️ 修改 hero-screen.tsx — "开始浏览"改为翻页按钮

**文件：** `apps/web/src/components/hero-screen.tsx`

当前 L88-94：
```tsx
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/12 px-7 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              href={buildExploreHref(locale)}
            >
              {t("hero.startBrowsing")}
              <MoveRight aria-hidden="true" className="h-4 w-4" />
            </Link>
```

替换为（改为 `<button>` + 自定义滚动事件）：
```tsx
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/12 px-7 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              onClick={() => {
                // 触发 wheel 事件使 FullscreenPageDeck 翻到下一页
                window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }))
              }}
              type="button"
            >
              {t("hero.startBrowsing")}
              <MoveRight aria-hidden="true" className="h-4 w-4" />
            </button>
```

同时在文件头部删除不再需要的 import（如果 `buildExploreHref` 仅用于此行）：
```diff
- import { buildExploreHref } from "@web/lib/home-navigation"
```
（如果 `buildExploreHref` 还在别处使用则保留）

---

## 变更清单

| 文件 | 操作 |
|---|---|
| `apps/web/src/components/fullscreen-page-deck.tsx` | 🆕 新建 |
| `apps/web/src/app/[locale]/page.tsx` | ✏️ +1 import, +2 行 JSX 包裹 |
| `apps/web/src/components/hero-screen.tsx` | ✏️ Link→button, 删除 buildExploreHref import |

---

## 交互效果

```
Page 0 (Hero) ──点击"开始浏览"──▶ Page 1 (History)
                                      │
                       点击↓ / 滚轮↓   │
                                      ▼
                                  Page 2 (Map)
                                      │
                       点击↓ / 滚轮↓   │
                                      ▼
                                  Page 3 (Adoption)
```

- 每页占满全屏（`h-screen w-screen`）
- 切换动画：`translateY` transition 500ms
- 底部圆点指示器显示当前位置
- 支持键盘 ↑↓ PageUp/PageDown
- 支持鼠标滚轮（800ms 防抖）
- HomeHeader 固定在顶部不动
