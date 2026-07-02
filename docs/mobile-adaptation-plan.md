# Codex 移动端适配执行计划 v2 — 走马村云脑系统

> **目标**：修复移动端真实 Bug，优化触屏体验，保证 320px-768px 下系统可用。
> **原则**：最小改动、不改架构、只用 Tailwind、逐文件提交、每步可验证。
> **域名**：`zoumavillage.xyz` | `admin.zoumavillage.xyz`
> **部署**：Vercel 自动部署 → push 即生效。

---

## 一、审计结论（修正后）

经过逐文件代码审查，原 v1 计划中多项"致命/严重"问题被重新评估：

| 原评级 | 修正评级 | 说明 |
|--------|----------|------|
| 🔴 AdminDataTable `min-w-[720px]` | 🟡 中等 | 横向滚动表格是移动端标准模式，功能正常，仅需加滑动提示 |
| 🔴 AdminSidebar 无汉堡菜单 | 🟢 不修 | 已有 pill 导航，功能完整；加抽屉引入新组件风险高 |
| 🟠 FullscreenPageDeck 缺指示器 | 🟢 不修 | 移动端正常滚动是刻意设计；IntersectionObserver 易出 Bug |
| 🟠 MasterDetailLayout 底部抽屉 | 🟢 不修 | 堆叠布局是标准响应式行为；BottomSheet 改架构风险极大 |
| 🟠 overflow-x-hidden 掩耳盗铃 | 🟡 中等 | 先查真实溢出原因，再针对性修复 |

> **结论：系统基础移动端适配已经不错，重点是修复 6 个真实问题 + 4 个轻量优化。**

---

## 二、执行批次

### 🟠 批次 1：触屏可用性修复（4 项）

---

#### Fix 1：反馈评分按钮 — 触摸目标优化

**文件**：`apps/web/src/app/[locale]/feedback/feedback-form.tsx`

**行号**：约 111

**当前代码**：
```tsx
<div className="mt-2 grid grid-cols-5 gap-2">
```

**修复**：
```tsx
<div className="mt-2 grid grid-cols-5 gap-1.5 sm:gap-2">
```

**理由**：减小间距让 5 个按钮在 320px 下各 ~60px，接近 iOS 推荐的 44pt 触摸目标。

**验证**：375px 下点击 5 颗星不误触。

---

#### Fix 2：村民收益卡片 — 极小屏适配

**文件**：`apps/web/src/app/[locale]/villager/earnings/villager-earnings-client.tsx`

**行号**：约 34

**当前代码**：
```tsx
<div className="mt-6 grid grid-cols-2 gap-3">
```

**修复**：
```tsx
<div className="mt-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
```

**理由**：320-399px 单列避免文字截断；400px+ 双列。

**验证**：320px 单列；390px (iPhone 14) 仍双列。

---

#### Fix 3：Admin 地图 — 移动端高度

**文件**：`apps/admin/src/components/admin-map.tsx`

**行号**：约 65

**当前代码**：
```tsx
className="h-[560px] w-full rounded-xl ..."
```

**修复**：
```tsx
className="h-[320px] sm:h-[420px] md:h-[560px] w-full rounded-xl ..."
```

**理由**：560px 在手机上占满全屏；320px 约 40% 屏幕高度。

**验证**：手机端地图不超半屏。

---

#### Fix 4：场景详情页 — 移动端场景切换

**文件**：`apps/web/src/app/[locale]/scenes/[slug]/page.tsx`

**行号**：约 74

**当前代码**：
```tsx
<nav className="hidden items-center gap-5 text-sm text-white/72 md:flex">
```

**问题**：移动端隐藏场景间导航，用户只能返回首页再进另一个场景。

**修复**：在页末（`</main>` 之前）新增移动端底部场景切换栏。需要从页面取到场景列表数据（四个 slug：ancient-road / lychee-field / resilience-valley / ridge-dwelling）。

```tsx
{/* 移动端场景快速切换 */}
<nav className="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-ink/95 backdrop-blur-md md:hidden">
  <div className="flex gap-1 overflow-x-auto px-3 py-3">
    {sceneLinks.map(({ href, label }) => (
      <Link
        key={href}
        href={href}
        className="shrink-0 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-white/72 transition active:bg-white/10"
      >
        {label}
      </Link>
    ))}
  </div>
</nav>
```

**注意**：`sceneLinks` 需要从当前页面的 props 或 context 获取。检查 `page.tsx` 中是否已有场景列表数据，如有则复用；如无则新增简单的场景链接数组。

**验证**：手机端场景详情页底部出现可横向滚动的场景切换栏。

---

### 🟡 批次 2：内容溢出修复（2 项）

---

#### Fix 5：移除 `overflow-x-hidden` 并修复真实溢出

**文件**（4 个）：
- `apps/web/src/app/[locale]/booking/page.tsx`（第 48 行）
- `apps/web/src/app/[locale]/feedback/page.tsx`（第 48 行）
- `apps/web/src/app/[locale]/routes/page.tsx`（第 44 行）
- `apps/web/src/app/[locale]/trees/page.tsx`（第 50 行）

**当前代码**：
```tsx
<main className="min-h-screen overflow-x-hidden bg-rice pb-16 text-ink">
```

**修复**：
```tsx
<main className="min-h-screen bg-rice pb-16 text-ink">
```

**⚠️ 重要执行步骤**：
1. 先改一个文件（如 routes/page.tsx）
2. `git commit` + `git push`
3. Vercel 部署后，手机浏览器打开该页面，375px 下检查是否有横向溢出
4. 无溢出 → 继续下一个文件
5. 有溢出 → 用 Chrome DevTools 定位溢出元素 → 修复根因（通常是固定宽度或 `white-space: nowrap`）

**常见溢出根因**：
- 如果子组件有 `w-[600px]`、`min-w-[500px]` 等 → 改为 `w-full max-w-[xxx]`
- 如果是 Leaflet 地图容器 → 确认父容器有 `min-w-0`
- 如果是 `SubpageHero` aside 面板 → 已响应式 ✅

**验证**：4 个页面在 375px 下无横向滚动条。

---

#### Fix 6：AdminDataTable 滑动提示

**文件**：`apps/admin/src/components/admin-data-table.tsx`

**行号**：约 41-45

**当前代码**：
```tsx
<div className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
  <div className="overflow-x-auto">
    <div className="min-w-[720px]">
```

**修复**：
```tsx
<div className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
  <div className="relative">
    <div className="overflow-x-auto">
      <div className="min-w-[640px] md:min-w-[720px]">
```
并在 `</div>`（overflow-x-auto 的闭合标签）之后添加：
```tsx
      {/* 移动端滑动提示渐变 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent md:hidden" />
    </div>
```

**注意**：需要给外层 `<div className="overflow-x-auto">` 改为两层结构（relative 包裹），原闭合标签也需相应调整。

**验证**：手机端表格右侧有渐变提示可滑动。

---

### 🟢 批次 3：细节优化（4 项）

---

#### Fix 7：Hero 统计卡片 — 中间尺寸 2 列

**文件**：`apps/web/src/components/hero-screen.tsx`

**行号**：约 152

**当前代码**：
```tsx
<div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur sm:mt-9 sm:grid-cols-3 sm:gap-3 sm:p-3">
```

**修复**：
```tsx
<div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur min-[480px]:grid-cols-2 sm:mt-9 sm:grid-cols-3 sm:gap-3 sm:p-3">
```

**验证**：480-639px 2 列；640px+ 3 列。

---

#### Fix 8：路线分段控件 — 宽度限制

**文件**：`apps/web/src/app/[locale]/routes/route-generator.tsx`

**行号**：约 140

**当前代码**：
```tsx
<SegmentedControl className="grid w-full grid-cols-2 sm:w-auto" ... />
```

**修复**：
```tsx
<SegmentedControl className="grid w-full max-w-xs grid-cols-2 sm:w-auto" ... />
```

**验证**：移动端分段控件居中，不撑满全屏。

---

#### Fix 9：GrowthAnimation 滑动提示

**文件**：`apps/web/src/components/growth-animation.tsx`

**行号**：约 43

**当前代码**：
```tsx
<div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3" role="group">
  {stages.map(...)}
</div>
```

**修复**：
```tsx
<div className="relative">
  <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3" role="group">
    {stages.map(...)}
  </div>
  <div className="pointer-events-none absolute inset-y-0 right-0 top-6 w-10 bg-gradient-to-l from-rice to-transparent md:hidden" />
</div>
```

**验证**：手机端卡片列表右侧有渐隐提示。

---

#### Fix 10：HistoryScroll 不做修改

**当前代码已正确**：移动端 `bg-local`（正常滚动），桌面端 `md:bg-fixed`（视差）。iOS Safari 的 `background-attachment: fixed` Bug 已通过降级方案规避。

---

## 三、不改动清单（已否决）

| 原计划项 | 否决原因 |
|----------|----------|
| AdminSidebar 汉堡菜单抽屉 | 现有 pill 导航功能完整，加抽屉引入新组件和状态管理 |
| FullscreenPageDeck 圆点指示器 | IntersectionObserver + 滚动检测逻辑复杂，易出 Bug |
| MasterDetailLayout BottomSheet | 架构级改动，影响预约/认养/购票三个核心流程 |
| Hero 标题移动端 i18n | 品牌名"云脉寿岭, 荔水走马"硬编码是设计选择 |
| Section 内边距调整 | `px-5` 已足够，改动影响全局 |
| 认养/预约卡片图片比例调整 | 当前堆叠布局可用，改比例可能引入新布局问题 |

---

## 四、修改文件汇总

| # | 文件 | 行数 | 风险 |
|---|------|------|------|
| 1 | `apps/web/.../feedback/feedback-form.tsx` | 1 | 极低 |
| 2 | `apps/web/.../villager/earnings/villager-earnings-client.tsx` | 1 | 极低 |
| 3 | `apps/admin/.../admin-map.tsx` | 1 | 极低 |
| 4 | `apps/web/.../scenes/[slug]/page.tsx` | ~15（新增） | 低 |
| 5 | `apps/web/.../booking/page.tsx` | 1 | 中（需验证） |
| 6 | `apps/web/.../feedback/page.tsx` | 1 | 中（需验证） |
| 7 | `apps/web/.../routes/page.tsx` | 1 | 中（需验证） |
| 8 | `apps/web/.../trees/page.tsx` | 1 | 中（需验证） |
| 9 | `apps/admin/.../admin-data-table.tsx` | ~8 | 低 |
| 10 | `apps/web/.../hero-screen.tsx` | 1 | 极低 |
| 11 | `apps/web/.../routes/route-generator.tsx` | 1 | 极低 |
| 12 | `apps/web/.../growth-animation.tsx` | ~5 | 极低 |

> **12 个文件，约 35 行改动，无新依赖，无架构变更。**

---

## 五、验证清单

| # | 页面 | 检查项 |
|---|------|--------|
| 1 | `zoumavillage.xyz` 首页 | 无横向滚动、统计卡片布局正确 |
| 2 | `zoumavillage.xyz/scenes/ancient-road` | 底部场景切换栏出现 |
| 3 | `zoumavillage.xyz/routes` | 分段控件不溢出 |
| 4 | `zoumavillage.xyz/trees` | 无横向溢出 |
| 5 | `zoumavillage.xyz/booking` | 无横向溢出 |
| 6 | `zoumavillage.xyz/feedback` | 评分按钮不误触、无溢出 |
| 7 | `zoumavillage.xyz/villager/earnings` | 卡片布局合理 |
| 8 | `admin.zoumavillage.xyz` 列表页 | 表格可滑动、有渐变提示 |
| 9 | `admin.zoumavillage.xyz` 地图页 | 地图高度合理 |

---

## 六、给 Codex 的执行指令

```
Codex，请按照 docs/mobile-adaptation-plan.md (v2) 执行移动端适配。

关键约束：
1. 只修改上述"修改文件汇总"中的 12 个文件，不要动其他文件
2. 用 replace_string_in_file 逐一修改，每次改完立即 git commit
3. commit 格式：fix(mobile): <简短描述>
4. 不要创建新组件（如 BottomSheet、Drawer），不要引入新 npm 包
5. 所有改动仅限 Tailwind 类名调整或少量 JSX 包裹
6. 批次 2（Fix 5）的 overflow-x-hidden 移除必须逐文件执行：
   → 改一个 → commit → push → 手机验证 → 通过后再改下一个
7. 修改完成后运行 pnpm build 确认无编译错误

从批次 1（Fix 1）开始。
```
