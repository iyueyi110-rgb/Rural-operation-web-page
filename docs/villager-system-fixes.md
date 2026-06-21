# 走马村村民系统 — Codex 修复指令

> 基于审查报告 `docs/villager-system-implementation.md` 的问题修复。
> 共 2 项修复，预计改动 3 个文件。

---

## FIX-1 🔴 认养激活时通知认养人

**文件：** `apps/web/src/app/api/v1/tree-adoptions/route.ts`

**问题：** PATCH 激活认养后生成互动任务，但认养人收不到通知。且通知中心的 `refId` 需要是 treeCode 才能正确跳转到树详情页。

**修改：** 在 PATCH handler 的激活逻辑块中，用 fire-and-forget 异步 IIFE 包裹通知创建（不阻塞响应）。

当前代码（L102-L106）：
```ts
  if (existing.status !== "active" && nextStatus === "active") {
    void generateInteractionTasks(data.id, data.treeId).catch((error) =>
      console.error("Failed to generate interaction tasks:", error),
    )
  }
```

替换为：
```ts
  if (existing.status !== "active" && nextStatus === "active") {
    void generateInteractionTasks(data.id, data.treeId).catch((error) =>
      console.error("Failed to generate interaction tasks:", error),
    )

    // 通知认养人：认养已激活 + 互动任务已就绪（fire-and-forget，不阻塞响应）
    void (async () => {
      const tree = await prisma.orchardTree.findUnique({
        where: { id: data.treeId },
        select: { treeCode: true },
      })
      await prisma.notification.create({
        data: {
          recipientType: "tourist",
          recipientId: data.adopterPhone ?? "",
          title: "🎉 你的果树认养已激活",
          body: "现在可以开始浇水、施肥、拍照等互动任务。打开果树页面查看你的专属任务。",
          category: "tree",
          refType: "tree_adoption",
          refId: tree?.treeCode ?? data.treeId,
        },
      })
    })().catch((error) =>
      console.error("Failed to create activation notification:", error),
    )
  }
```

> **关键细节：**
> - `refId` 存 **treeCode**（如 `"LZ-018"`），不存 adoptionId。原因：游客通知中心点击跳转 `router.push(/trees/${refId})`，而 `trees/[code]` 页面接收的是 treeCode。
> - 用 `void (async () => {...})().catch(...)` 确保树查询 + 通知创建不阻塞 PATCH 响应。
> - `data.adopterPhone` 已在 DB 中为 masked 格式（如 `138****5678`），与通知中心的查询一致。

---

## FIX-2 ⚪ 通知中心 category 服务端过滤

**文件：** 需两步改动

**问题：** 游客通知中心先查全部通知再客户端 `.filter()`。API 的 category 参数只支持单值。

**Step 1 — 改 API 支持多 category：**

文件：`apps/web/src/app/api/v1/notifications/route.ts`（GET handler，L17-L34）

将 category 的单值逻辑：
```ts
const category = searchParams.get("category")
// ...
if (category && !isNotificationCategory(category)) {
  return jsonResponse(request, { error: "Invalid category" }, { status: 400 })
}
// ...
const validCategory = isNotificationCategory(category) ? category : undefined
// ...
...(validCategory ? { category: validCategory } : {}),
```

替换为多值：
```ts
const rawCategories = searchParams.getAll("category")
if (rawCategories.some((c) => !isNotificationCategory(c))) {
  return jsonResponse(request, { error: "Invalid category" }, { status: 400 })
}
const validCategories = rawCategories.filter(isNotificationCategory)
// ...
...(validCategories.length > 0 ? { category: { in: validCategories } } : {}),
```

**Step 2 — 改前端使用服务端过滤：**

文件：`apps/web/src/app/[locale]/me/notifications/tourist-notification-center.tsx`（load 函数，L22-L26）

将：
```ts
const response = await fetch(
  `/api/v1/notifications?recipientType=tourist&recipientId=${encodeURIComponent(currentPhone)}`
)
if (response.ok) {
  const result = (await response.json()) as { data: AppNotification[] }
  setNotifications(result.data.filter((item) => ["tree", "activity"].includes(item.category)))
}
```

替换为：
```ts
const response = await fetch(
  `/api/v1/notifications?recipientType=tourist&recipientId=${encodeURIComponent(currentPhone)}&category=tree&category=activity`
)
if (response.ok) {
  const result = (await response.json()) as { data: AppNotification[] }
  setNotifications(result.data)
}
```

---

## 已排除的项

### ~~FIX-3 告警通知去重~~ → 无需修复

`alert-engine.ts` 的 `createAlertIfAbsent` 函数中，L64 的 `if (existing) return existing` 确保了**只有新告警才会走到 L76 的通知创建代码**。已存在的告警直接返回，不会重复创建通知。**原有代码已正确处理去重，无需修改。**

---

## 变更清单

| FIX | 文件 | 改动量 | 优先级 |
|---|---|---|---|
| FIX-1 | `apps/web/src/app/api/v1/tree-adoptions/route.ts` | ~18 行 | 🔴 必须 |
| FIX-2 Step 1 | `apps/web/src/app/api/v1/notifications/route.ts` | ~5 行 | ⚪ 可选 |
| FIX-2 Step 2 | `apps/web/src/app/[locale]/me/notifications/tourist-notification-center.tsx` | ~3 行 | ⚪ 可选 |

**合计：约 26 行，3 个文件。**

---

## 执行顺序

```
1. FIX-1（认养激活通知）→ 必须修
2. FIX-2（category 服务端过滤）→ 可选，先 Step 1 再 Step 2
```
