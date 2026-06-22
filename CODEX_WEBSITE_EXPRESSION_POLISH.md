# 走马村网站表达效果优化 — Codex 执行指令（完整版 v2）

> **项目名称**: 走马村数字村落运营系统 (zouma-village-system)
> **项目路径**: `d:\1\AIGC\`
> **目标受众**: 建筑规划 / 乡村运营 / 数字村落项目的评审专家、投资人、政府汇报
> **核心目标**: 提升网站汇报、展示、答辩的表达效果——让网站更清晰、更高级、更有系统感
> **核心原则**: 不做大规模重构，不破坏已有功能逻辑，分阶段审计→方案→修改→验证

---

# 第一部分：全站审计报告（Codex 必须先理解再动手）

## 1. 当前网站整体结构

```
zouma-village-system (Monorepo: pnpm + Turborepo)
├── apps/web/  (游客前台, Next.js 14 App Router, 端口 3000)
│   ├── /                         首页 (FullscreenPageDeck 全屏纵向滑动)
│   │   ├── HeroScreen            [P1] 视频背景 + 标题 + 天气 + 统计数据
│   │   ├── HistoryScroll         [P2] 唐代→荔枝古道→清代→当代 四段历史纵深
│   │   ├── RealmMapGateway       [P3] 四境互动地图 (高德/Leaflet双provider)
│   │   └── HomeAdoptionFeature   [P4] 荔枝树认养预览 + CTA
│   ├── /explore                  二级探索页 (历史+天气卡片+地图)
│   ├── /scenes/[slug]            四境详情 (古道/荔田/韧谷/岭上)
│   ├── /routes                   路线生成工具
│   ├── /booking                  院落预约
│   ├── /trees                    荔枝树认养
│   ├── /tickets                  门票预购
│   ├── /products                 农产品预订
│   ├── /calendar                 农事日历 (节气时间线)
│   ├── /activities               活动广场
│   ├── /feedback                 反馈提交
│   ├── /me                      个人中心
│   ├── /privacy                  隐私中心
│   └── /villager/*              村民端 (登录/面板/任务/收益/通知)
├── apps/admin/ (管理后台, 端口 3001)
│   ├── /dashboard                五流运营总览 (生产/游客/生态/反馈/智策)
│   ├── /map, /nodes, /orders, /trees, /alerts...
│   ├── /ai-assistant, /content-factory
│   └── /settings
└── packages/ui/ (共享组件)
    ├── Section.tsx              最大宽度容器
    ├── StatusBadge.tsx          状态标签
    ├── PageHeader.tsx           子页面顶部导航条
    └── MasterDetailLayout.tsx   主从布局
```

## 2. 每个页面的功能与表达目的

| 页面 | 功能 | 在当前叙事中的角色 | 表达目的 |
|------|------|-------------------|---------|
| **首页 Hero** | 视频/标题/天气/统计 | 项目门面 | 3秒内传达项目是什么 |
| **首页 History** | 四段历史纵深滚动 | 时间维度权威感 | 证明项目有历史根基 |
| **首页 Map** | 四境互动地图 | 空间维度直观感 | 展示可运营的四境空间 |
| **首页 Adoption** | 认养预览+CTA | 参与维度转化感 | 引导用户行动 |
| **Scenes** | 四境详情页 | 场景深度说明 | 每个境的系统逻辑和运营价值 |
| **Routes** | 路线生成 | 游客工具 | 降低到访决策门槛 |
| **Booking** | 院落预约 | 消费转化 | 住宿变现入口 |
| **Trees** | 荔枝树认养 | 深度参与 | 建立全年复访关系 |
| **Tickets** | 门票预购 | 消费转化 | 活动/研学变现 |
| **Products** | 农产品预订 | 消费转化 | 农产品变现 |
| **Calendar** | 农事日历 | 内容展示 | 展示乡村运营节奏 |
| **Me** | 个人中心 | 用户工具 | 订单/认养管理 |
| **Feedback** | 反馈提交 | 运营闭环 | 收集用户意见 |
| **Villager** | 村民端 | 运营工具 | 村民任务/收益管理 |
| **Admin** | 管理后台 | 运营管理 | 数据大屏+模块管理 |

> **关键发现**: 首页的叙事逻辑是"门面 → 历史 → 空间 → 参与"，但缺少"问题陈述"和"系统逻辑摘要"两个关键环节。访客不知道这个项目为什么重要、解决什么痛点。

## 3. 当前表达效果的核心问题

### 3.1 首页价值主张缺失
- HeroScreen 只有标题"云脉寿岭，荔水走马"和一行副标题
- 没有回答：**这是什么项目？解决什么问题？核心系统是什么？**
- 天气卡片和统计数据放在最底部，信息层级颠倒了
- 全屏PageDeck 页面之间没有叙事标签，访客不知道自己在看什么

### 3.2 标题风格偏"后台系统"而非"汇报展示"
- 子页面标题用的是 `font-extrabold` + `break-all`，更像管理面板
- 所有子页面的标题布局完全一样（eyebrow + h1 + body），缺少叙事节奏感
- 没有形成"问题 → 系统 → 场景 → 运营 → 收益"的信息递进

### 3.3 导航信息过载
- 导航栏有 8 个链接 + 4 个操作按钮，一字排开
- 移动端导航完全隐藏（`hidden md:flex`），移动端用户看不到任何导航
- 缺少"当前在哪个页面"的视觉反馈

## 4. 信息层级是否清楚 — 评分 6/10

| 维度 | 现状 | 问题 |
|------|------|------|
| 页面内层级 | eyebrow → h1 → body 三段式 | ✅ 清楚 |
| 页面间层级 | 所有子页面完全相同 | ❌ 无差异化 |
| 卡片层级 | 主要/次要卡片视觉权重相同 | ❌ 无区分 |
| 叙事节奏 | 首页4页无过渡说明 | ❌ 无引导 |
| 视觉锚点 | 缺少引导阅读路径的视觉线索 | ❌ 无引导 |

## 5. 页面视觉风格是否统一 — 评分 5.5/10

**不统一的具体证据**:
- web 和 admin 的 tailwind 颜色定义用了**不同的十六进制值**（见下方对照表）
- `.hero-serif` 引用了 `Noto Serif SC`，但 layout 只加载了 `Noto Sans SC`（只有无衬线体）
- 卡片圆角：有的 `rounded-lg`，有的 `rounded-md`，有的 `rounded-xl`
- 按钮：有的 `rounded-full`，有的 `rounded-md`，高度 h-10/h-11/h-12 混用
- 阴影：有的用 `shadow-soft`，有的用自定义 `shadow-[...]`
- 字体粗细：`font-semibold`、`font-bold`、`font-extrabold` 混用无规则

**当前配色对照**:
```
              web           admin
ink:         #19201b       #20312b    ← 不同!
moss:        #46624a       #51785f    ← 不同!
lychee:      #b93835       #b93835    ← 相同
water:       #2f7686       #507184    ← 不同!
rice:        #f5f0e4       #f6f2e9    ← 不同!
stone:       #ded5c4       #ded6c8    ← 不同!
```

## 6. 首页是否能快速说明项目价值 — 评分 4/10

当前首页只传达了两件事：① 好看（视频背景）② 有内容（天气/地图/认养）。
但**没有传达**：
- ❌ 项目是什么（一站式乡村运营方案）
- ❌ 解决什么痛点（乡村资源碎片化、缺乏数字运营手段）
- ❌ 核心系统逻辑（AIGC云脑 + 四境 + 五流运营）
- ❌ 用户能看到什么、得到什么（可浏览→可预约→可认养→可复访的闭环）

## 7. 导航是否清楚 — 评分 6/10

- ✅ 桌面端导航结构清晰，链接齐全
- ❌ 链接数量过多（8个）且无分组，认知负荷高
- ❌ 移动端完全隐藏导航（`hidden md:flex`），这是体验断裂点
- ❌ 缺少面包屑或当前位置指示
- ✅ "开始浏览"CTA 按钮位置突出

## 8. 卡片、图表、标题、按钮是否统一 — 评分 5/10

| 元素 | 现状 | 问题数量 |
|------|------|---------|
| 卡片 | 各处手动写 `rounded-lg border border-stone bg-white p-5 shadow-soft` | 重复代码，圆角/间距不统一 |
| 按钮 | lychee/moss/water/ink 颜色混用于不同操作类型 | 颜色语义不明确 |
| 标题 | 全部 `font-extrabold`，字号只有 `text-3xl sm:text-5xl` 两种 | 缺少中标题和小标题级别 |
| 图标 | lucide-react，统一 | ✅ 没问题 |
| Badge | 只有 StatusBadge 一种，白色半透明 | 缺少信息/成功/警告变体 |

## 9. 移动端和不同屏幕尺寸是否存在问题

| 问题 | 影响范围 | 严重度 |
|------|---------|--------|
| `bg-fixed` 在 iOS Safari 有已知bug（固定背景闪烁/不跟随） | HistoryScroll 全部4段 | 高 |
| `break-all` 对中文不自然（会在单个汉字中间断行） | 8个页面 | 中 |
| 导航在移动端完全隐藏 (`hidden md:flex`) | 全站移动端 | 高 |
| FullscreenPageDeck 触摸手势需验证 | 首页 | 中 |
| 地图区域 min-height: 520px 在小型手机上可能过高 | 首页/探索页 | 低 |
| hero-serif 字体未加载，回退到无衬线体 | 所有使用 hero-serif 的标题 | 中 |

## 10. 最值得优先优化的 10 个问题（按优先级排序）

| 优先级 | 问题 | 影响 | 阶段 |
|--------|------|------|------|
| **P0** | 首页缺少"项目价值主张"和系统逻辑摘要 | 访客30秒内不知道网站解决什么问题 | B |
| **P0** | hero-serif 字体引用但未加载 | 品牌视觉受损，所有大标题字体回退不可控 | A |
| **P1** | web 和 admin 颜色定义不一致 | 系统感缺失，同一品牌两套颜色 | A |
| **P1** | 所有子页面标题完全相同 | 缺少叙事节奏，所有页面看起来一样 | D |
| **P1** | 移动端导航隐藏 + bg-fixed bug | 移动端体验断裂 | G |
| **P1** | 首页缺少动态效果和叙事引导 | 首屏不够"汇报级别"的展示感 | B+F |
| **P2** | 卡片层级不清晰 | 所有模块视觉权重相同，无阅读路径 | C+D |
| **P2** | 按钮颜色语义不统一 | 用户不确定哪个是主操作 | C+D |
| **P2** | 缺少微动效和过渡 | 缺乏高级感，页面切换生硬 | F |
| **P3** | break-all 中文断词 | 中文阅读体验差 | G |

---

# 第二部分：分阶段优化方案

## 阶段 A：基础设施修复（字体 + 颜色统一）

**目标**: 把不统一的底层修复，让后续所有改动有正确的视觉基础。

### A1. 加载 Noto Serif SC 字体
**文件**: `apps/web/src/app/[locale]/layout.tsx`

```
改动内容：
1. 从 next/font/google 同时导入 Noto_Serif_SC
2. 两个字体都设置 CSS variable
3. html 标签的 className 加入两个 variable
```

### A2. 更新 hero-serif CSS 类
**文件**: `apps/web/src/app/globals.css`

```
将 font-family 硬编码改为 CSS variable 优先：
font-family: var(--font-serif), "Noto Serif SC", "Songti SC", "STSong", Georgia, serif;
```

### A3. 统一 admin 颜色为 web 颜色
**文件**: `apps/admin/tailwind.config.ts`

```
将 admin 的 ink/moss/rice/stone/water 改为与 web 完全一致的值
只保留 admin 的 lychee: #b93835（与 web 相同，不需要改）
```

> ⚠️ **风险提示**: admin dashboard 使用硬编码颜色（如 `bg-[#0b1411]`），不会受此影响。但需要检查其他使用 tailwind token 的 admin 页面。

### A4. 验证
```bash
pnpm build && pnpm lint
```

---

## 阶段 B：首页首屏重组 + 动态效果（核心阶段）

**目标**: 让首页首屏变成一个完整的"项目展示入口"。

### B1. HeroScreen 重组布局

**文件**: `apps/web/src/components/hero-screen.tsx`

当前 HeroScreen 布局顺序：
```
[StatusBadge] → [h1 标题] → [p 副标题] → [两个按钮] → [天气卡片 + 统计]
```

优化后布局：
```
[StatusBadge]
[h1 标题]
[系统摘要胶囊条: 山地乡村 · AIGC韧性更新 | 四境可运营体验 | 可浏览/可预约/可认养/可复访]
[p 副标题: 说明 问题→系统→价值]
[两个按钮]
[动态数字滚动区: 3个核心数据带计数动画]
[天气卡片 + 统计]
```

### B2. 首页动态效果设计 ⭐（用户明确要求）

**文件**: `apps/web/src/components/hero-screen.tsx`（改造） + 新建 `apps/web/src/components/count-up.tsx`

动态效果清单：

| 效果 | 触发时机 | 实现方式 | 备注 |
|------|---------|---------|------|
| **标题逐字淡入** | 页面加载后 200ms | framer-motion staggerChildren | 仅首屏h1，约0.8s完成 |
| **系统摘要胶囊依次弹入** | 标题完成后 100ms | framer-motion spring动画 | 3个胶囊依次弹入，间隔150ms |
| **数字计数动画** | 页面加载后 800ms | CountUp组件（0→目标值，1.2s） | 研究范围1.8km²/林地3107亩/耕地2383亩 |
| **视频背景缓慢缩放** | 持续（微小幅度） | CSS @keyframes scale(1→1.03) 20s循环 | 极慢、极微妙，不分散注意力 |
| **CTA按钮光晕呼吸** | 页面加载后 1.5s | CSS @keyframes box-shadow 脉冲 | 轻量，2s周期，引导点击 |
| **向下滚动提示箭头** | 页面加载后 1.5s | CSS @keyframes 上下浮动 + 淡出 | 第3秒后自动消失 |

> ⚠️ **动态效果铁律**:
> - 所有动效必须适配 `prefers-reduced-motion: reduce`（关闭全部动画）
> - 所有动效持续时间 ≤ 1.2s（除了持续的缩放/呼吸）
> - 不用夸张的弹性动画，用 ease-out / cubic-bezier(0.22, 1, 0.36, 1)
> - 数字计数动画只在首次进入时播放一次（用 sessionStorage 标记）

### B3. FullscreenPageDeck 增加叙事导航标签

**文件**: `apps/web/src/components/fullscreen-page-deck.tsx`

在页面指示器（dot导航）旁边增加叙事标签：

```
第1页 dot● 项目总览    ← 当前页标签
第2页 dot○ 
第3页 dot○ 
第4页 dot○
```

**实现方式**: 给 FullscreenPageDeck 增加可选 prop `pageLabels?: string[]`（默认 undefined 保持兼容）。在 `apps/web/src/app/[locale]/page.tsx` 中传入：
```tsx
pageLabels={[t("deck.page1"), t("deck.page2"), t("deck.page3"), t("deck.page4")]}
```
对应 i18n key：`home.deck.page1` = "项目总览"，`page2` = "历史纵深"，`page3` = "四境空间"，`page4` = "参与方式"

### B4. 首页增加「核心系统逻辑」过渡面板

在 HeroScreen 底部（视频遮罩层之上、天气卡片之下）增加一个轻量的系统逻辑标签条：
```tsx
<div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-white/50">
  <span>📍 重庆长寿区凤城街道走马村</span>
  <span className="text-white/20">|</span>
  <span>🔗 问题 → 系统 → 场景 → 运营 → 收益</span>
  <span className="text-white/20">|</span>
  <span>☁️ AIGC 云脑驱动 · 五流协同运营</span>
</div>
```
> 这段文字也加到 i18n 中。

### B5. 动态界面创建清单（Codex 逐项执行）

```
[ ] 安装 framer-motion: pnpm add framer-motion --filter @zouma/web
[ ] 新建 apps/web/src/components/count-up.tsx（数字滚动组件）
[ ] 新建 apps/web/src/components/fade-in.tsx（淡入wrapper）
[ ] 改造 hero-screen.tsx：重组布局 + 集成动态效果
[ ] 改造 fullscreen-page-deck.tsx：增加 pageLabels prop + 叙事标签UI
[ ] 更新 page.tsx：传入 pageLabels
[ ] 更新 globals.css：添加关键帧动画（视频缩放、CTA光晕、滚动提示）
[ ] 更新 i18n zh-CN/en/ja：新增 home.hero.tagline1/2/3, home.deck.page1/2/3/4
[ ] 构建验证
[ ] pnpm dev 手动检查所有动态效果
```

### B6. 验证
```bash
pnpm build && pnpm lint
```
手动检查项：
- [ ] 首页加载后标题有淡入效果
- [ ] 3个数字有计数动画（从0滚动到目标值）
- [ ] 视频背景有极慢缩放
- [ ] CTA按钮有光晕呼吸
- [ ] 向下滚动提示箭头出现后3秒消失
- [ ] 切换到 reduced-motion 后所有动效停止

---

## 阶段 C：视觉系统统一（卡片 + 按钮 + 背景）

### C1. 统一全局背景渐变

**文件**: `apps/web/src/app/globals.css`

当前 body 背景用了 `rgba(185, 56, 53, 0.1)` 的红色光晕（lychee色），对"自然山地村落"主题不够准确。

优化为：用 moss（苔绿）和 water（水蓝）的极淡色，替代 lychee 红色，更贴近山地/村落/生态感：
```css
body {
  min-width: 320px;
  background:
    radial-gradient(circle at 20% 10%, rgba(70, 98, 74, 0.05), transparent 28rem),
    radial-gradient(circle at 80% 90%, rgba(47, 118, 134, 0.035), transparent 24rem),
    linear-gradient(180deg, #f7f3e8 0%, #efe7d6 55%, #f9f5eb 100%);
  color: var(--foreground);
}
```

### C2. 定义卡片层级（3级卡片体系）

在 `globals.css` 末尾增加：

```css
/* === 卡片层级体系 === */

/* 一级卡片：页面核心内容，最高视觉权重 */
.card-primary {
  @apply rounded-xl border border-stone bg-white shadow-soft;
}

/* 二级卡片：辅助信息，中等视觉权重 */
.card-secondary {
  @apply rounded-lg border border-stone/60 bg-white/70;
}

/* 三级卡片：补充说明，最低视觉权重 */
.card-tertiary {
  @apply rounded-lg bg-rice/70;
}

/* 深色卡片：用于强调区域（如CTA区） */
.card-dark {
  @apply rounded-xl border border-white/10 bg-ink text-white shadow-soft;
}

/* 卡片悬停动效（可选的增强类） */
.card-hover {
  @apply transition-all duration-300 ease-out;
}
.card-hover:hover {
  @apply -translate-y-1 shadow-lg;
}
```

然后按页面逐个替换：
- 场景详情页（scenes/[slug]）：主要信息区 → card-primary，侧边栏 → card-dark
- 路线/预约/认养/门票页面：主内容卡片 → card-primary，辅助提示 → card-secondary
- 探索页天气卡片：card-dark

### C3. 定义按钮体系（4种按钮 + 颜色语义）

在 `globals.css` 末尾增加：

```css
/* === 按钮体系 === */

/* 主要CTA：认养、预约、购票等核心转化操作 */
.btn-primary {
  @apply inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lychee px-6 text-sm font-bold text-white shadow-soft transition hover:bg-[#a8312f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97];
}

/* 次要操作：查看详情、了解更多、返回 */
.btn-secondary {
  @apply inline-flex h-11 items-center justify-center gap-2 rounded-full border border-stone bg-white px-6 text-sm font-bold text-ink transition hover:bg-rice focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97];
}

/* 幽灵按钮：深色背景上的轻操作 */
.btn-ghost {
  @apply inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97];
}

/* 小尺寸变体（用于卡片内紧凑操作） */
.btn-sm {
  @apply h-9 px-4 text-xs;
}
```

**颜色语义约定**（Codex 替换按钮时参考）:
| 按钮用途 | 使用 class | 颜色含义 |
|---------|-----------|---------|
| 认养荔枝树 / 预约院落 / 购买门票 / 预订农产 | `btn-primary` | lychee红 = 行动号召 |
| 查看详情 / 生成路线 / 了解更多 / 返回首页 | `btn-secondary` | 白色 = 信息浏览 |
| 开始浏览 / 登录 / 在深色背景上的操作 | `btn-ghost` | 透明 = 辅助操作 |
| 卡片内的小操作（上传照片、提交反馈） | `btn-primary + btn-sm` | 小号CTA |

### C4. 验证
```bash
pnpm build && pnpm lint
```

---

## 阶段 D：页面结构与信息层级优化

### D1. 页面分类与差异化标题

按功能将子页面分为三类，每类用不同的标题区样式：

| 分类 | 页面 | 标题区特征 |
|------|------|-----------|
| **展示型** | routes, calendar, activities | 标题下有「快速摘要条」 |
| **转化型** | booking, tickets, trees, products | 标题旁有「规则/保障卡片」，不变 |
| **工具型** | me, privacy, feedback | 简洁标题，不变 |

对于展示型页面（routes, calendar, activities），在标题区下方增加一个快速摘要条：
```tsx
<div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-ink/45">
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5">
    <Clock className="h-3 w-3" /> 预计浏览 3 分钟
  </span>
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5">
    <MapPin className="h-3 w-3" /> 重庆长寿区 · 走马村
  </span>
</div>
```

### D2. 导航分组优化

**文件**: `apps/web/src/components/home-header.tsx`

当前8个导航链接按使用场景分组：

**核心浏览**（始终显示）: 四境 → 路线 → 院落 → 认养
**服务与消费**: 门票 / 农产 / 农事 → 归入「更多」下拉
**账户与系统**: 个人中心 / 隐私中心 / 村民入口 → 保持在右侧

桌面端实现：用 Tailwind `group` + `hidden group-hover:block` 实现「更多」下拉菜单，不需要 JS。

移动端实现：汉堡菜单（阶段 G3）。

### D3. 验证
```bash
pnpm build && pnpm lint
```

---

## 阶段 E：共享组件增强（packages/ui）

### E1. StatusBadge 增加 variant 变体

**文件**: `packages/ui/src/status-badge.tsx`

新增可选 `variant` prop（默认 `"default"` 保持向后兼容）：

| variant | 使用场景 | 颜色 |
|---------|---------|------|
| `default` | 首页状态标签 | 白色半透明（现有样式不变） |
| `info` | 信息提示 | water色（水蓝） |
| `success` | 成功/已确认 | moss色（苔绿） |
| `warning` | 注意/待处理 | 琥珀色 |

### E2. Section 增加 background prop

**文件**: `packages/ui/src/section.tsx`

新增可选 `background?: "none" | "rice" | "white" | "ink"` prop，默认 `"none"`。让 Section 可以在需要时自带背景色，减少外层额外包裹。

### E3. 验证
```bash
pnpm build && pnpm lint
```

---

## 阶段 F：动效与交互反馈（非首页部分）

### F1. 页面进入淡入效果

已创建 `fade-in.tsx`（阶段B），现在在各子页面的标题区域使用：
```tsx
<FadeIn>
  <h1>...</h1>
  <p>...</p>
</FadeIn>
```

### F2. 全屏页面切换优化

**文件**: `apps/web/src/components/fullscreen-page-deck.tsx`

优化页面切换过渡：当前使用 `transition-transform duration-500 ease-in-out`，改为更优雅的 `duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]`（material-design 标准缓出曲线）。

### F3. 卡悬停微动效

给关键卡片添加 `card-hover` 类（已在阶段 C2 定义）。

### F4. 验证
```bash
pnpm build && pnpm lint
```
在 `prefers-reduced-motion: reduce` 下确认动效全部关闭。

---

## 阶段 G：移动端适配修复

### G1. bg-fixed → bg-local（iOS 兼容）

**文件**: `apps/web/src/components/history-scroll.tsx`

将历史段落卡片的 `bg-fixed` 改为 `bg-local md:bg-fixed`（移动端使用 bg-local 避免 iOS Safari bug，桌面端保持视差效果）。

### G2. break-all → break-words（中文友好）

**全局修改**: 所有子页面的 `break-all` 改为 `break-words`

涉及文件（8个）:
- `apps/web/src/app/[locale]/routes/page.tsx`
- `apps/web/src/app/[locale]/booking/page.tsx`
- `apps/web/src/app/[locale]/trees/page.tsx`
- `apps/web/src/app/[locale]/products/page.tsx`
- `apps/web/src/app/[locale]/calendar/page.tsx`
- `apps/web/src/app/[locale]/me/page.tsx`
- `apps/web/src/app/[locale]/tickets/page.tsx`
- `apps/web/src/app/[locale]/scenes/[slug]/page.tsx`

> Codex 用 grep 找到所有 `break-all` 并替换为 `break-words`。

### G3. 移动端导航菜单

**文件**: `apps/web/src/components/home-header.tsx`

增加移动端汉堡菜单：
- `md:hidden` 显示汉堡按钮（三条横线图标）
- 点击展开全屏菜单面板（framer-motion AnimatePresence）
- 菜单项使用与桌面端相同的链接
- 点击菜单项或背景蒙层后关闭

### G4. 移动端视口验证

在 DevTools 中检查 375px / 414px / 768px 三个宽度：
- [ ] 无文字溢出
- [ ] 无卡片挤压变形
- [ ] 导航可使用
- [ ] 地图高度适配（移动端 min-height 降低到 360px）
- [ ] HeroScreen 视频/图片正常显示

### G5. 验证
```bash
pnpm build && pnpm lint
```

---

## 阶段 H：i18n 翻译同步

**原则**: 每次在 `zh-CN.json` 中新增 key 后，必须同步到 `en.json` 和 `ja.json`。

新增的 i18n key 汇总：

```
home.hero.tagline1      "山地乡村 · AIGC韧性更新"
home.hero.tagline2      "四境可运营体验"
home.hero.tagline3      "可浏览 · 可预约 · 可认养 · 可复访"
home.hero.systemLogic   "AIGC 云脑驱动 · 五流协同运营"
home.hero.location      "重庆长寿区凤城街道走马村"
home.hero.narrative     "问题 → 系统 → 场景 → 运营 → 收益"
home.deck.page1         "项目总览"
home.deck.page2         "历史纵深"
home.deck.page3         "四境空间"
home.deck.page4         "参与方式"
```

> Codex 自行翻译英文和日文版本，至少保证 key 存在。

---

## 阶段 I：最终检查与打包

```bash
cd d:\1\AIGC

# 1. 确保在 website-expression-polish 分支
git branch

# 2. 安装所有依赖
pnpm install

# 3. 代码检查
pnpm lint

# 4. TypeScript 类型检查
pnpm type-check

# 5. 构建
pnpm build

# 6. 启动开发服务器验证
pnpm dev
```

浏览器验收清单：
- [ ] `/` 首页：视频/动态效果/叙事标签是否正常
- [ ] `/` 首页：数字是否计数动画
- [ ] `/` 首页：CTA 按钮是否有光晕
- [ ] `/` 首页：向下滚动是否流畅切换页面
- [ ] `/explore`：探索页是否正常
- [ ] `/scenes/ancient-road` 等4个详情页是否正常
- [ ] `/routes` `/booking` `/trees` `/tickets`：功能页面是否正常
- [ ] `/products` `/calendar`：展示页面是否有快速摘要条
- [ ] `/me` `/privacy` `/feedback`：工具页面是否正常
- [ ] `/villager/login` 等村民端是否正常
- [ ] 桌面端 1440px/1920px：布局是否协调
- [ ] 移动端 375px/414px/768px：无溢出、导航可用
- [ ] `prefers-reduced-motion: reduce`：动效是否全部停止
- [ ] Admin 后台 `/dashboard`：颜色是否正常

---

# 第三部分：Codex 执行流程汇总

## 分支与提交
```bash
# 第0步：创建分支
git checkout -b website-expression-polish

# 每个阶段完成后的提交规范：
git add -A
git commit -m "feat(expression): Phase X — [阶段名称]

- 修改文件1: 改动说明
- 修改文件2: 改动说明
Verified: pnpm build && pnpm lint passed"
```

## 执行顺序（必须按序执行）
```
A 基础设施修复        → pnpm build && pnpm lint
B 首页首屏+动态效果    → pnpm build && pnpm lint + 手动验收动态效果
C 视觉系统统一         → pnpm build && pnpm lint
D 页面结构+信息层级    → pnpm build && pnpm lint
E 共享组件增强         → pnpm build && pnpm lint
F 动效与交互反馈       → pnpm build && pnpm lint + reduced-motion测试
G 移动端适配           → pnpm build && pnpm lint + 移动端视口测试
H i18n翻译同步         → pnpm build（确认无key缺失）
I 最终检查与打包       → pnpm install && pnpm lint && pnpm build && pnpm dev
```

---

# 第四部分：最终交付物

## 1. 全站优化总结

优化后网站将实现：
- ✅ 首页首屏可在 3 秒内传达"这是什么项目、解决什么问题"
- ✅ 叙事逻辑形成"问题→系统→场景→运营→收益"的闭环
- ✅ 色彩统一为低饱和自然色系（山地/村落/生态感）
- ✅ 卡片分三级，按钮分四种，视觉层级清晰
- ✅ 动效克制优雅（淡入/计数/微缩放/光晕），适配 reduced-motion
- ✅ 移动端导航可用、文字不断行、背景不闪烁
- ✅ 中英日三语翻译完整

## 2. 主要修改文件列表（预估）

```
apps/web/src/app/[locale]/layout.tsx           ← 字体加载
apps/web/src/app/globals.css                    ← hero-serif / body背景 / 卡片/按钮体系
apps/admin/tailwind.config.ts                   ← 颜色统一
apps/admin/src/app/globals.css                  ← 可能需要微调
apps/web/src/components/hero-screen.tsx          ← 重组布局 + 动态效果集成
apps/web/src/components/fullscreen-page-deck.tsx ← pageLabels + 叙事标签 + 切换优化
apps/web/src/components/home-header.tsx          ← 导航分组 + 移动端菜单
apps/web/src/components/history-scroll.tsx       ← bg-fixed修复
apps/web/src/components/count-up.tsx             ← 新建：数字计数组件
apps/web/src/components/fade-in.tsx              ← 新建：淡入wrapper
apps/web/src/app/[locale]/page.tsx              ← 传入 pageLabels
apps/web/src/app/[locale]/routes/page.tsx       ← 标题差异化 + break-words
apps/web/src/app/[locale]/booking/page.tsx      ← break-words
apps/web/src/app/[locale]/trees/page.tsx        ← break-words
apps/web/src/app/[locale]/tickets/page.tsx      ← break-words
apps/web/src/app/[locale]/products/page.tsx     ← break-words + 标题差异化
apps/web/src/app/[locale]/calendar/page.tsx     ← break-words + 标题差异化
apps/web/src/app/[locale]/me/page.tsx           ← break-words
apps/web/src/app/[locale]/scenes/[slug]/page.tsx ← break-words
packages/ui/src/status-badge.tsx                 ← variant prop
packages/ui/src/section.tsx                      ← background prop
apps/web/messages/zh-CN.json                    ← 新增key
apps/web/messages/en.json                       ← 同步key
apps/web/messages/ja.json                       ← 同步key
```

## 3. 优化前后差异说明

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| 品牌字体 | Noto Sans SC 一种字体，hero-serif 回退不可控 | Sans + Serif 双字体通过 CSS variable 正确加载 |
| 颜色 | web/admin 各自定义不同色值 | 统一为同一套低饱和自然色系 |
| 首页 | 标题+副标题+天气卡片，无动态效果 | 标题淡入+系统摘要+数字计数+视频微缩放+CTA光晕+叙事标签 |
| 叙事 | 四个全屏页无引导 | 每个页面有名称标签，底栏显示进度 |
| 卡片 | 所有卡片样式完全相同 | 三级卡片体系（primary/secondary/tertiary） |
| 按钮 | 颜色混用无规则 | 四种按钮（primary/secondary/ghost/sm），颜色语义明确 |
| Badge | 仅白色半透明一种 | 四种变体（default/info/success/warning） |
| 子页面标题 | 全部相同 | 按页面类型差异化 |
| 导航 | 8个链接+移动端隐藏 | 4核心+更多下拉+移动端汉堡菜单 |
| 动效 | 无 | 淡入/计数/悬停/按下，适配reduced-motion |
| 移动端 | bg-fixed闪/bug、break-all断词、无导航 | 全部修复 |
| 中英文 | 部分硬编码 | 全部走i18n，三语齐全 |

## 4. 还可以继续优化的方向（不做，仅建议）

1. **四境详情页增加 3D 模型或大图展示** — 每个场景（古道/荔田/韧谷/岭上）的理想鸟瞰图
2. **AI 路线生成实时推荐** — 根据天气+人数+兴趣自动组合路线
3. **认养树的生长时间线动画** — 从种植到收获的视觉时间线
4. **首页增加声音设计** — 轻量的环境音（溪水/鸟鸣/风声）
5. **管理后台大屏模式** — dashboard 适配电视/投影全屏展示
6. **离线 PWA 增强** — 让整个网站在弱网环境下也能展示核心内容
7. **运营数据对比图表** — 在展示型页面增加 bars/radar 图表说明运营效果
8. **多语言内容深度翻译** — 当前日文版为机翻，可做专业翻译

## 5. 给汇报 PPT 使用的网站讲解话术

### 开场（15秒 — 指向首页首屏）
> "大家请看首页——走马村不是一个景区包装项目，而是一套**乡村运营的数字系统**。我们通过 AIGC 云脑，把山岭、古道、荔枝林、岭上院落组织成**四个可运营的场景**，让每一位游客都能完成从浏览、预约、认养到复访的完整闭环。"

### 叙事逻辑（30秒 — 逐页下滑）
> "网站的信息组织遵循**问题→系统→场景→运营→收益**的逻辑：
> 第一页——项目总览，快速建立'这是什么、为什么重要'的认知；
> 第二页——历史纵深，用唐代建制到清代碑刻的四段史实，证明项目不是凭空而来；
> 第三页——四境空间，用互动地图展示古道、荔田、韧谷、岭上四个可运营的场景；
> 第四页——参与方式，展示认养、预约、路线生成等核心转化功能。"

### 系统感（15秒 — 强调技术和设计）
> "在技术层面，网站采用低饱和自然色系，克制的高级感适合建筑规划汇报场景。所有数据模块都有动态反馈，但动效非常克制——只用于进入、切换和重点强调，不分散内容注意力。"

### 移动端（10秒 — 展示多设备）
> "我们已经在手机、平板、桌面端做了适配，任何设备都能流畅浏览。移动端的导航菜单、地图交互、表单都经过专门优化。"

### 结尾（10秒 — 总结价值）
> "这个网站本身就是一个**可演示的运营系统**——它不是静态宣传页，而是把乡村资源数字化、可运营化的基础设施。游客浏览的每一页，都对应后台的一个运营模块。"

---

# ⚠️ 最重要的 10 条注意事项

1. **必须用 pnpm，不是 npm** — 安装用 `pnpm install`，加包用 `pnpm add <pkg> --filter <package-name>`
2. **i18n key 必须三语同步** — zh-CN.json 新增的 key，en.json 和 ja.json 必须有对应条目，否则 next-intl 构建报错
3. **packages/ui 的修改影响两个 app** — 改 Section/StatusBadge/PageHeader 后必须 web 和 admin 都验证
4. **不要改动已有 props 名称** — 只能新增可选 prop，绝不重命名已有 prop
5. **Leaflet CSS 导入不能动** — layout.tsx 中的 `import "leaflet/dist/leaflet.css"` 是地图组件依赖
6. **admin dashboard 的硬编码颜色不要改** — `bg-[#0b1411]`、`bg-[#14211d]` 等保持不变
7. **FullscreenPageDeck 的触摸/滚轮逻辑不要动** — 只改 UI 层（样式、标签、页面指示器），逻辑代码不动
8. **地图组件支持双 provider（高德+Leaflet）** — 修改地图容器样式时要两个都测试
9. **所有动效必须适配 reduced-motion** — 用 Tailwind `motion-reduce:` 前缀或 CSS `@media (prefers-reduced-motion: reduce)`
10. **每完成一个阶段必须 `pnpm build && pnpm lint`** — 不能等到最后一起修，及早发现问题
