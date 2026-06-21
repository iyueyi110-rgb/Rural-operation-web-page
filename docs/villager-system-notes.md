# 走马村 — 村民端 / 通知推送 / 互动任务 执行注意事项

> **对照文件：** `docs/villager-system-implementation.md`
> **核心原则：** 不破坏已有功能、不过度设计、预留扩展接口。

---

## 一、数据库迁移注意事项

### 1.1 迁移前检查

- [ ] 确认当前数据库有完整备份（`pg_dump` 或等效操作）
- [ ] 确认 `DATABASE_URL` 指向正确的开发/测试库，**严禁直接对生产库执行 migrate**
- [ ] 先执行 `npx prisma migrate dev --create-only` 预览迁移 SQL
- [ ] 检查自动生成的 SQL 是否仅包含 `CREATE TABLE` + 少量 `ALTER TABLE`，没有 `DROP`

### 1.2 Notification 表设计约束

- `recipientType` 三种值：`"villager"`、`"tourist"`、`"operator"`
- `recipientId` 的语义取决于 recipientType：
  - `villager` → `Villager.id`
  - `tourist` → `adopterPhone`（手机号，当前为明文）。前端从 `localStorage.getItem("tourist_phone")` 获取——该值在认养/预约/购票流程中写入
  - `operator` → `"all"`（广播给所有运营者）
- `channel` 当前仅使用 `"in_app"`，但**必须保留 `"sms"` 和 `"wechat"` 枚举值**——后续接入真实推送通道时不需要改 schema
- `refType` + `refId` 用于"点击通知跳转到关联实体"，格式：`refType=task` → `/villager/tasks?highlight={refId}`
- 模型必须包含 `updatedAt DateTime @updatedAt @map("updated_at")`——与其他所有模型保持一致

### 1.3 VisitorInteractionTask 设计约束

- `adoptionId` 是外键指向 `TreeAdoption`——**只有当认养状态为 `active` 时才应生成任务**
- `taskType` 枚举固定为 5 种：`watering` / `fertilizing` / `photo_upload` / `diary` / `share`，不在其内的值 API 应拒绝
- `points` 值：watering=10, fertilizing=10, photo_upload=15, diary=20, share=15
- 不要给 `points` 设置默认值以外的自动计算逻辑——积分规则后续可能调整
- ⚠️ **必须同时在 `TreeAdoption` 和 `OrchardTree` 模型中添加反向关系字段** `interactionTasks VisitorInteractionTask[]`，否则 Prisma migrate 报关系不完整错误

### 1.4 Villager 模型修改

- `otpCode` 和 `otpExpiry` 仅在当前阶段用于模拟登录（验证码直接返回到 response）
- **这两个字段是临时的**——Epic 10（统一登录）完成后应迁移到统一的 `User` 模型
- 在 schema 中用注释标记：`// TODO: 迁入统一登录系统后废弃`

---

## 二、API 安全注意事项

### 2.1 村民认证（临时方案）

- 当前验证码方案**不是生产级安全方案**——验证码明文返回、token 为 base64 编码（非 JWT 签名）
- 上线前必须替换为：
  - 短信服务商（阿里云短信/腾讯云短信）发送真实验证码
  - 或 JWT + refresh token 标准方案
- 临时 token 的解析函数 `getVillagerIdFromToken` 必须处理：
  - token 格式错误（不是 `villager_` 前缀）→ 返回 null
  - base64 解码失败 → 返回 null
  - 解码后格式不符合 `{id}_{timestamp}` → 返回 null
  - 时间戳超过 7 天 → 返回 null（强制重新登录）

### 2.2 通知 API 权限

- 通知创建（POST）是**内部 API**——由系统钩子调用，不应暴露给前端
- 在前端仅暴露 GET（查询自己的通知）和 PATCH（标记已读）
- PATCH 的 `markAllRead` 必须校验 `recipientType` + `recipientId`，防止跨用户标记

### 2.3 互动任务 API 权限

- GET 按 `adoptionId` 筛选——前端应仅传入当前用户所拥有的认养 ID
- 当前阶段无登录体系，**adoptionId 通过查询字符串传递，存在越权风险**
- 缓解措施：查询时同时校验 `adopterPhone`（从 query string 传入，与认养记录匹配）
- Epic 10 完成后应改为：从 token 中提取用户身份，只返回该用户的互动任务

### 2.4 通用约束

- 所有新增 API 必须使用 `jsonResponse(request, ...)` 和 `optionsResponse(request)`
- 所有 POST/PATCH 必须先用 `request.json().catch(() => null)` 解析，再用 `isPlainObject` 校验
- 字符串字段必须 `.trim()`

---

## 三、集成钩子注意事项

### 3.1 告警→通知（alert-engine.ts）

- 通知创建**必须是异步、非阻塞的**——使用 `.catch()` 静默处理错误
- 不允许因为通知创建失败而阻塞告警本身的创建
- 高严重度告警（severity="high"）的标题前缀使用 🔴，其余用 🟡
- 已在 `alert-engine.ts` 中的告警类型标签映射表（alertTypeLabel）不要重复定义——提取为共享常量

### 3.2 日报→通知（report-generator.ts）

- 通知创建放在 `generateDailyReport` 的最后，upsert 成功后
- 仅当日报是新生成的（而非更新的）才创建通知——通过检查 `upsert` 的返回值判断
- body 字段取 `summary` 的前 200 字符，避免超出数据库字段长度

### 3.3 养护建议→通知（care-advisor.ts）

- ⚠️ `generateCareAdvice()` 返回 `Promise<string>`（一段面向所有树的养护建议文本），**不是** `{treeId, content}` 结构化对象——不能按单棵树拆分
- **正确做法：** 通知所有活跃认养人（按 `adopterPhone` 去重），发送通用"果园本周养护建议"通知
- 去重：`distinct: ["adopterPhone"]` + 再过滤掉 null/空字符串
- 使用 `Promise.allSettled` 并发创建通知——不用 `for` 循环串行
- `recipientId` 使用 `adopterPhone`——这是当前阶段唯一可用的游客标识

### 3.4 认养激活→互动任务（tree-adoptions/route.ts）

- ⚠️ **该路由当前仅有 GET 和 POST，没有 PATCH handler**——必须先新增 PATCH handler 才能挂载钩子
- 新增 PATCH 的代码结构参考 `apps/web/src/app/api/v1/tasks/route.ts` 的 PATCH 模式
- 仅在状态**从非 active 变为 active** 时触发——检查 `existing.status !== "active" && nextStatus === "active"`
- 如果已有活跃的互动任务——不重复生成。检查逻辑：`prisma.visitorInteractionTask.findFirst({ where: { adoptionId, status: "pending" } })`
- `generateInteractionTasks` 函数需要：
  - 获取树的 `harvestSeason` 字段
  - 生成 4 周任务——批量 `createMany` 而非逐条 `create`

### 3.5 任务分配→通知（tasks/route.ts）

- 仅在 POST 创建**且指定了 villagerId** 时发送通知
- PATCH 修改任务（如改派给其他村民）时也应发送通知给新村民
- 通知的 `refId` 使用 `data.id`（创建成功后的 task ID）

---

## 四、前端注意事项

### 4.1 村民门户隔离

- ⚠️ `villager/layout.tsx` **第一行必须是 `"use client"`**——layout 中需要 `useEffect` 读取 localStorage token 和 `useRouter` 跳转，Server Component 无法访问这些 API
- 村民门户**不与游客前台共用 Header/Nav**——使用独立的 `villager/layout.tsx`
- 村民页面不需要四境导航、天气组件等游客向内容
- 底部 TabBar 固定在页面底部（`position: fixed; bottom: 0`），移动端优先
- 验证逻辑写在 layout 的 `useEffect` 中——token 无效或过期 → `router.replace("/villager/login")`

### 4.2 Token 存储

- 使用 `localStorage` 存储 villager token，key 为 `"villager_token"`
- 不要在 URL 参数中传递 token
- API 请求通过 `X-Villager-Token` header 携带
- 封装一个 `fetchWithVillagerAuth(url, options)` 工具函数，统一处理 token 注入

### 4.3 通知中心

- 通知列表支持"下拉刷新"（手动调用 GET）
- 未读通知左侧有蓝色竖条标记
- "全部已读"按钮调用 PATCH `{ markAllRead: true }`
- 通知点击跳转规则：
  - `refType=task` → `/villager/tasks`（村民）或空操作（游客）
  - `refType=alert` → 空操作（游客不可见运营告警）
  - `refType=report` → 空操作（游客不可见运营日报）
  - `refType=tree_adoption` → `/trees/{treeCode}`
- 游客通知仅显示 `category=tree` 或 `category=activity` 的通知

### 4.4 互动任务面板

- 仅在树详情页**且存在活跃认养**时渲染
- 判断条件：从 URL query 或 localStorage 获取当前用户手机号 → 匹配认养记录的 `adopterPhone` → 认养状态为 `active`
- 任务类型图标映射：
  - watering → 💧
  - fertilizing → 🪴
  - photo_upload → 📸
  - diary → 📝
  - share → 📤
- "完成任务"按钮点击后调用 PATCH `/api/v1/interactions`，成功后刷新任务列表
- 拍照上传：使用 `<input type="file" accept="image/*">`，上传到 `/api/v1/upload`，拿到 URL 后传入 PATCH 的 `imageUrl`

### 4.5 通知铃铛组件

- **渲染方式：浮动按钮**（`position: fixed; bottom: 1.5rem; right: 1.5rem`），不是嵌入 Header
  - 原因：当前每个 page.tsx 各自渲染 header（无共享 Header 组件），浮层方案无需修改任何现有页面
- 组件放在 `apps/web/src/app/[locale]/layout.tsx` 中，在 `<NextIntlClientProvider>{children}</NextIntlClientProvider>` 之后渲染
- 组件自身是 Client Component（`"use client"`）
- 从 `localStorage.getItem("tourist_phone")` 获取手机号——取不到时组件返回 `null`（不渲染）
- 每 30 秒轮询一次未读数（`setInterval` + `GET /notifications?isRead=false`）
- 角标数字 > 99 时显示 "99+"
- 点击跳转 `/me/notifications`

### 4.6 游客身份传递

- 通知铃铛需要游客手机号才能查询通知。当前阶段无登录系统，因此：
  - 在认养流程（`adoption-flow.tsx`）、预约流程（`booking-flow.tsx`）、购票流程（`ticket-flow.tsx`）中，用户填写手机号后 → `localStorage.setItem("tourist_phone", phone)`
  - 通知铃铛组件从 `localStorage.getItem("tourist_phone")` 获取
  - 树详情页互动面板同理
- 这是一个临时方案——Epic 10 登录体系完成后应改为从 token 提取用户身份

---

## 五、不破坏已有功能的红线

### 5.1 禁止修改的文件

以下文件**禁止任何修改**，除非明确授权：

- `packages/utils/src/index.ts`（ModelProviderAdapter 等核心工具）
- `packages/database/src/index.ts`（Prisma 客户端单例）
- `apps/web/src/lib/aigc-api.ts`（`jsonResponse` / `optionsResponse` 等基础函数——如需扩展，新增函数而非修改现有函数）
- `apps/web/src/middleware.ts`（国际化路由中间件）
- 所有现有 API 路由的 GET/POST 逻辑（仅在需要添加钩子时追加代码，不修改现有逻辑）

### 5.2 数据库迁移不破坏现有数据

- 新增模型和字段**只做 `CREATE TABLE` 和 `ALTER TABLE ... ADD COLUMN`**
- 不允许 `DROP`、`RENAME`、修改现有列类型
- 新增字段必须有 `DEFAULT` 值或允许 `NULL`
- 迁移 SQL 必须可回滚（记录回滚 SQL 到迁移文件注释中）

### 5.3 依赖不膨胀

- **不新增 npm 依赖**——使用已有的 `next`、`prisma`、`react`、`next-intl`、`lucide-react`
- 验证码生成使用 `Math.random()`（当前阶段足够）
- 不使用 `jsonwebtoken`、`bcrypt`、`nodemailer`、`twilio` 等额外依赖

---

## 六、测试检查点

### 6.1 API 测试

- [ ] 创建通知 → GET 查询能检索到
- [ ] 游客标记通知已读 → 仅自己的通知被标记
- [ ] 批量全部已读 → 仅自己的通知被标记
- [ ] 村民请求 OTP → phone 不匹配时返回 404
- [ ] 村民验证 OTP → 错误 OTP 返回 401
- [ ] 村民查看自己的任务 → 仅返回自己的任务
- [ ] 村民更新任务状态 → 只能按状态机流转（pending→accepted→in_progress→completed）
- [ ] 互动任务创建 → 无效 adoptionId 返回错误
- [ ] 互动任务完成 → 写入 completedAt

### 6.2 集成测试

- [ ] 触发告警 → 检查 notification 表中是否有对应记录
- [ ] 手动调用日报生成 → 检查是否创建了 report 通知
- [ ] 修改认养状态为 active → 检查是否生成了互动任务
- [ ] 创建分配给村民的任务 → 检查是否创建了 task 通知

### 6.3 前端测试

- [ ] 村民登录流程：输入手机号 → 获取验证码 → 输入验证码 → 跳转仪表盘
- [ ] 村民任务流转：待接取 → 点击接取 → 点击开始 → 点击完成
- [ ] 游客通知铃铛：有未读时显示角标 → 点击进入通知中心 → 标记已读后角标消失
- [ ] 互动任务：认养用户进入树详情页 → 看到互动任务 → 点击完成浇水 → 任务变为已完成

---

## 七、后续升级路径

| 当前方案 | 升级目标 | 触发条件 |
|---|---|---|
| 验证码明文返回 | 接入阿里云/腾讯云短信 | Epic 10 统一登录 |
| base64 临时 token | JWT + refresh token | Epic 10 统一登录 |
| `recipientId` 用手机号 | 统一 User ID | Epic 10 用户体系 |
| in_app 通知 | SMS + 微信模板消息 | 支付系统就绪后 |
| 互动任务手动生成 | 认养激活自动生成 + 定时推送提醒 | Phase 4 集成完成 |
| 村民 Web 轻门户 | 微信小程序 | 运营需求确定后 |

---

## 八、常见错误预防

1. **Prisma 反向关系遗漏：** `VisitorInteractionTask` 通过 `@relation` 指向 `TreeAdoption` 和 `OrchardTree`，**必须在这两个模型中也添加反向字段** `interactionTasks VisitorInteractionTask[]`。Prisma 要求双向关系定义完整，单边定义会导致 migrate 失败。

2. **tree-adoptions 缺少 PATCH handler：** 该路由仅实现了 GET 和 POST。认养状态变更（包括激活→生成互动任务）需要通过 PATCH 实现。**不要忘记先新增 PATCH handler**，代码结构参考 `tasks/route.ts` 的 PATCH。

3. **care-advisor 返回值类型错误：** `generateCareAdvice()` 返回 `Promise<string>`（纯文本），不是 `{ treeId, content }`。设计通知钩子时不能按单棵树拆分——应通知所有活跃认养人。

4. **villager/layout.tsx 缺少 `"use client"`：** 任何使用 `useEffect`、`useRouter`、`localStorage` 的组件必须声明为 Client Component。没有这个指令，Next.js 会在服务端渲染时崩溃。

5. **通知铃铛的游客身份问题：** 通知 API 需要 `recipientId=phone` 来查询。游客端通过 `localStorage.getItem("tourist_phone")` 获取——该值需在认养/预约/购票流程中写入。**如果取不到 phone，组件不渲染。**

6. **Notification 模型缺少 updatedAt：** 现有 schema 中所有 16 个模型都有 `updatedAt`。新增模型必须保持一致。

7. **互动任务生成时机错误：** 不要在 POST（创建认养）时生成——创建时状态是 `pending_payment`，不是 `active`。正确时机是 PATCH 中状态从非 active → active 时触发。

8. **通知表膨胀：** 每个告警、每个日报、每个任务分配都创建通知。如果日活数据量大，`notification` 表可能快速增长。**缓解：** 对同类型通知做去重（如同一任务重复通知不创建）。后续可添加定时清理脚本（清理 30 天前的已读通知）。

9. **Prisma Client 热重载：** schema 修改后，在 API 路由中使用 `prisma.notification` 和 `prisma.visitorInteractionTask` 之前，必须重新生成 Prisma Client。如果 IDE 类型报错，先运行 `npx prisma generate`。
