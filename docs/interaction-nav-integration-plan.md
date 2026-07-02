# 互动系统导航入口集成 — Codex 执行指令

> **目的**：将「互动任务系统」(`/me/interactions`) 接入网站主导航的「更多」下拉菜单。
> **Commit ref**：基于 `3d37341`（互动系统已实现）
> **变更范围**：3 个文件（2 修改 + 1×3 语言 i18n）
> **日期**：2026-07-01

---

## 一、现状分析

### 1.1 当前导航结构

文件 `apps/web/src/components/home-header.tsx` 定义了顶部导航栏：

```
[走马村] [个人中心] [村民登录] [隐私中心]  |  [门票预购] [农事] [活动] [路线] [院落预定] [更多▾]  [登录] [开始浏览]
```

**「更多」下拉**（`HomeMoreMenu` 组件）当前包含 3 项：

| 顺序 | label key | 中文 | 路由 |
|------|-----------|------|------|
| 1 | `nav.realms` | 四境 | `/explore#realms` |
| 2 | `nav.adoption` | 认养 | `/trees` |
| 3 | `nav.weather` | 天气 | `/explore#weather` |

```ts
// home-header.tsx 中的定义
const moreNavItems = [
  { href: buildExploreHref(locale, "realms"), label: t("nav.realms") },
  { href: `/${locale}/trees`, label: t("nav.adoption") },
  { href: buildExploreHref(locale, "weather"), label: t("nav.weather") },
]
```

### 1.2 移动端菜单

`mobileItems = [...coreNavItems, ...moreNavItems, ...accountItems]` — 自动包含「更多」中的所有项，无需单独处理。

### 1.3 互动系统页面

已存在 `apps/web/src/app/[locale]/me/interactions/page.tsx`，路由为 `/me/interactions`。

---

## 二、执行步骤

### Step 1：i18n — 添加导航键

**文件**：`apps/web/messages/zh-CN.json`、`en.json`、`ja.json`

在 `home.nav` 对象中新增 `interactions` 键。

**zh-CN.json** — 在 `"activities": "活动"` 之后添加：

```json
"interactions": "互动"
```

**en.json** — 同样位置：

```json
"interactions": "Tasks"
```

**ja.json** — 同样位置：

```json
"interactions": "インタラクション"
```

> ⚠️ 在三个语言文件中插入的位置必须一致（都紧跟在 `"activities"` 之后，逗号正确），否则 JSON 解析会失败。

### Step 2：home-header.tsx — 添加菜单项

**文件**：`apps/web/src/components/home-header.tsx`

在 `moreNavItems` 数组中追加一项（放在「天气」之后）：

```ts
const moreNavItems = [
  { href: buildExploreHref(locale, "realms"), label: t("nav.realms") },
  { href: `/${locale}/trees`, label: t("nav.adoption") },
  { href: buildExploreHref(locale, "weather"), label: t("nav.weather") },
  { href: `/${locale}/me/interactions`, label: t("nav.interactions") },  // ← 新增
]
```

---

## 三、变更后效果

### 3.1 「更多」下拉菜单

```
┌─────────────┐
│ 🎫 四境      │
│ 🌳 认养      │
│ 🌤 天气      │
│ 🎯 互动      │  ← 新增，点击跳转 /me/interactions
└─────────────┘
```

### 3.2 移动端菜单

自动包含「互动」项（因为 `mobileItems` 展开 `moreNavItems`）。

### 3.3 桌面端导航栏

不变（互动仍在下拉中，不占主导航位）。

---

## 四、文件变更清单

```
✏️  修改  apps/web/src/components/home-header.tsx    (moreNavItems 追加 1 项)
✏️  修改  apps/web/messages/zh-CN.json               (home.nav 新增 interactions 键)
✏️  修改  apps/web/messages/en.json                  (同上)
✏️  修改  apps/web/messages/ja.json                  (同上)
```

---

## 五、注意事项

1. **不修改 `HomeMoreMenu` 组件**：该组件是通用的，接收 `items` 数组渲染，无需改动。
2. **不修改 `HomeMobileMenu`**：`mobileItems` 通过展开运算符已自动包含。
3. **不修改 `home-navigation.ts`**：互动系统路由已是固定路径 `/me/interactions`，不需要新的 URL 构建器。
4. **路由无需 locale 前缀处理**：`home-header.tsx` 已在所有链接中拼接 `/${locale}/`，继续沿用即可。
5. **JSON 逗号陷阱**：在三语 i18n 文件中，新增的 `"interactions"` 键如果放在 `"activities"` 之后，需要确保 `"activities"` 行尾有逗号，且 `"interactions"` 不是最后一个键时行尾也要有逗号。
6. **排序约定**：「互动」放在「天气」之后，因为它是认养功能的延伸（认养 → 互动），逻辑上紧跟认养相关项。
7. **`home-more-menu.tsx` 中的 Ticket 图标逻辑**：当前 `HomeMoreMenu` 对包含 `/tickets` 的链接添加了特殊图标。新增的 `/me/interactions` 不包含 `/tickets`，不会触发该逻辑，无需改动。
8. **互动系统页面已有鉴权**：`/me/interactions/page.tsx` 是独立页面，进入后会通过 phone 查询认养。无认养的用户会看到手机号输入引导界面，不会报错。

---

## 六、验证清单

- [ ] `pnpm build`（或 `next build`）无错误
- [ ] 桌面端：hover「更多」，下拉菜单出现「互动」项
- [ ] 点击「互动」，跳转到 `/me/interactions`
- [ ] 移动端：打开汉堡菜单，列表中包含「互动」项
- [ ] 点击移动端「互动」，同样跳转正确
- [ ] 三语切换：zh-CN 显示「互动」、en 显示「Tasks」、ja 显示「インタラクション」

---

> **变更量极小（4 个文件，共约 12 行新增），无破坏性修改，无新增依赖。**
