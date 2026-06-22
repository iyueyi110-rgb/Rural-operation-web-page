# 走马村系统 — 终审修复指令

> **问题：** HistoryScroll 和 RealmMapGateway 组件已创建但未接入首页，三阶流线缺失后两阶。

---

## FIX-1 🔴 首页接入历史叙事长卷和四境地图网关

**文件：** `apps/web/src/app/[locale]/page.tsx`

### 当前代码（L1-L51）

```tsx
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { HeroScreen } from "@web/components/hero-screen"
import { HomeAdoptionFeature } from "@web/components/home-adoption-feature"
import { HomeHeader } from "@web/components/home-header"
import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { getWeatherSummary } from "@web/lib/weather"
// ... metadata ...
export default async function HomePage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const weather = await getWeatherSummary()
  return (
    <main className="overflow-hidden text-ink">
      <HomeHeader locale={params.locale} />
      <HeroScreen locale={params.locale} weather={weather} />
      <HomeAdoptionFeature locale={params.locale} />
    </main>
  )
}
```

### 替换为

```tsx
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { HeroScreen } from "@web/components/hero-screen"
import { HistoryScroll } from "@web/components/history-scroll"
import { HomeAdoptionFeature } from "@web/components/home-adoption-feature"
import { HomeHeader } from "@web/components/home-header"
import { RealmMapGateway } from "@web/components/realm-map-gateway"
import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { getWeatherSummary } from "@web/lib/weather"
// ... metadata (不变) ...
export default async function HomePage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const weather = await getWeatherSummary()
  return (
    <main className="overflow-hidden text-ink">
      <HomeHeader locale={params.locale} />
      <HeroScreen locale={params.locale} weather={weather} />
      <HistoryScroll />
      <RealmMapGateway />
      <HomeAdoptionFeature locale={params.locale} />
    </main>
  )
}
```

### 改动量

- +2 行 import
- +2 行 JSX
- 其他代码完全不动

---

## 验证

- [ ] 首页加载 → Hero 视频首屏 → 向下滚动 → 历史叙事长卷可见（四段内容）
- [ ] 继续滚动 → 四境地图网关可见（交互多边形/GeoJSON 图层）
- [ ] 继续滚动 → 认养预览区域可见
- [ ] Header 导航栏 + 村民入口链接保持正常
- [ ] `pnpm turbo dev` 无编译错误
